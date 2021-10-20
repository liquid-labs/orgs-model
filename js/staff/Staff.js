import * as fs from 'fs'

import { Evaluator } from '@liquid-labs/condition-eval'

import { StaffMember } from './StaffMember'
import { AttachedRole } from '../roles'

const Staff = class {
  constructor(fileName) {
    this.fileName = fileName
    const data = JSON.parse(fs.readFileSync(fileName))
    this.members = data.map((rec) => new StaffMember(rec))

    this.checkCondition = checkCondition

    this.key = 'email'

    this.map = indexMembers(this.members)
  }

  // TODO: depracated
  getAll() { return this.members.slice() }
  list() { return this.members.slice() }

  get(email) { return this.map[email] }

  getByRoleName(roleName) { return this.members.filter(s => s.hasRole(roleName)) }

  addData(memberData, { deferHydration = false }) {
    this.members.push(new StaffMember(memberData))
    if (!deferHydration) { this.hydrate(this.org) }
  }

  remove(email) {
    email = email.toLowerCase()
    const matches = this.getAll().filter(member => member.email === email)

    // TODO: also need to check if this person is a manager and refuse to remove until that's changed
    if (matches.length === 0) {
      throw new Error(`Could not find staff member with email ${email}.`)
    }
    else if (matches.length > 1) {
      throw new Error(`Staff database consistency error. Found multiple entires for '${email}'.`)
    }

    this.members = this.members.filter(member => member.email !== email)
  }

  write() { fs.writeFileSync(this.fileName, this.toString()) }

  /**
   * Swaps out references to roles and managers by name and email (respectively) with the actual role and manager
   * objects.
   */
  hydrate(org) {
    this.org = org

    this.map = indexMembers(this.members)

    this.members.forEach((s) => {
      s.roles = s.roles.reduce((roles, rec) => { // Yes, both maps AND has side effects. Suck it!
        if (rec instanceof AttachedRole) {
          roles.push(rec)
          return roles
        }

        if (typeof rec === 'string') {
          rec = { name : rec }
        }
        // Verify rec references a good role. Note, we check the 'orgStructure' because there may be a role defined
        // globally that isn't in use in the org.
        const role = org.getRoles().get(rec.name,
          {
            required  : true,
            errMsgGen : (name) => `Staff member '${s.getEmail()}' claims unknown role '${name}'.`
          })

        roles.push(convertRoleToAttached({ staffMember : s, rec, role, org : this.org }))
        processImpliedRoles(roles, s, rec, role, this.org)
        return roles
      }, []) // StaffMember roles reduce
    }) // StaffMember iteration

    // we need to determine the manager role after everything else has been set up because the manager's role is not
    // determined strictly by the abstract org chart alone, since there may be multiple candidates
    this.members.forEach((s) => {
      s.getAttachedRoles().forEach((attachedRole) => {
        let roleManager = attachedRole.getManager()
        if (attachedRole.isTitular()) {
          // if there's only one possible manager, let's set it
          if (roleManager === null) {
            const possibleManagerNodes = this.org.orgStructure
              .getNodeByRoleName(attachedRole.name)
              .getPossibleManagerNodes()

            const possibleManagers = possibleManagerNodes.reduce((list, node) => {
              list.push(...org.staff.getByRoleName(node.name))
              return list
            }, [])

            if (possibleManagers.length === 1) {
              const managerEmail = possibleManagers[0].email
              const managedRoleName = attachedRole.getName()
              roleManager = hydrateManager({ org, staffMember : s, managerEmail, managedRoleName })
              attachedRole.manager = roleManager
            }
          }
          if (roleManager !== null) {
            let managerRole = null
            const node = org.orgStructure.getNodeByRoleName(attachedRole.name)
            if (node === undefined) { throw new Error(`Did not find org structure node for '${attachedRole.name}'.`) }
            if (node.primaryManagerNodeName) {
              if (roleManager.hasRole(node.primaryManagerNodeName)) {
                managerRole = roleManager.getAttachedRole(node.primaryManagerNodeName)
              }
              else {
                node.possibleMngrNames.some((name) => (managerRole = roleManager.getAttachedRole(name)))
              }
            }
            attachedRole.managerRole = managerRole
          } // has manager check
        } // titular check
      })
    })

    return this
  }

  /**
  * Returns the JSON string of the de-hydrated data structure.
  */
  toString() {
    const flatJson = this.members.map((s) => {
      const data = {
        email            : s.getEmail(),
        familyName       : s.getFamilyName(),
        givenName        : s.getGivenName(),
        startDate        : s.getStartDate(),
        roles            : [],
        employmentStatus : s.getEmploymentStatus(),
        parameters       : s.getParameters(),
        tbd              : s.tbd
      }
      s.roles.forEach((attachedRole) => {
        if (attachedRole.impliedBy === undefined) {
          const roleData = {
            name      : attachedRole.getName(),
            manager   : attachedRole.getManager()?.getEmail(),
            qualifier : attachedRole.qualifier,
            acting    : attachedRole.acting,
            layout    : attachedRole.layout
          }

          data.roles.push(roleData)
        }
      })

      return data
    })

    return JSON.stringify(flatJson, null, '  ')
  }
}

const indexMembers = (members) =>
  members.reduce((acc, member, i) => {
    if (acc[member.getEmail()] !== undefined) {
      throw new Error(`Staff member with email '${member.getEmail()}' already exists at entry ${i}.`)
    }
    acc[member.getEmail()] = member
    return acc
  }, {})

const convertRoleToAttached = ({ staffMember, rec, role, org, impliedBy, display }) => {
  if (role.isTitular()) {
    // notice we check 'rec', not 'role'; role may be implied.
    const orgNode = org.orgStructure.getNodeByRoleName(rec.name)
    if (orgNode === undefined) {
      throw new Error(`Staff member '${staffMember.getEmail()}' claims role '${rec.name}' not used in this org.`)
    }
    // TODO: check the prim manager from the org structure persective
    // orgNode.getPrimaryManagerNode() !== null
  }

  // TODO: this is only valid for titular roles, yeah? nest this if...
  let roleManager = null
  if (role.titular === true) {
    if (rec.manager && typeof rec.manager === 'string') {
      roleManager = hydrateManager({ org, staffMember, managerEmail : rec.manager, managedRoleName : role.name })
    }
  }

  // TODO: have constructor take an object and include 'impliedBy'
  const attachedRole = new AttachedRole(role, rec, roleManager, staffMember)
  attachedRole.display = display
  if (impliedBy !== undefined) { attachedRole.impliedBy = impliedBy }
  staffMember.attachedRolesByName[role.name] = attachedRole
  return attachedRole
}

// Replace manager ID with manager object and add ourselves to their reports
const hydrateManager = ({ org, managerEmail, managedRoleName, staffMember }) => {
  const roleManager = org.getStaff().get(managerEmail)

  if (roleManager === undefined) {
    throw new Error(`No such manager '${managerEmail}' found while loading staff member '${staffMember.getEmail()}'.`)
  }

  // Add ourselves to the manager's reports
  if (roleManager.reportsByReportRole[managedRoleName] === undefined) {
    roleManager.reportsByReportRole[managedRoleName] = []
  }
  roleManager.reportsByReportRole[managedRoleName].push(staffMember)

  return roleManager
}

const processImpliedRoles = (roles, s, rec, role, org) => {
  for (const { name: impliedRoleName, mngrProtocol, display } of role.implies || []) {
    // An implied role can come from multiple sources, so let's check if it's already in place
    if (!roles.some((r) => r.name === impliedRoleName)) {
      const impliedRole = org.getRoles().get(impliedRoleName,
        {
          required  : true,
          errMsgGen : (name) => `Staff member '${s.getEmail()}' claims unknown role '${name}' (by implication).`
        })

      // console.error(`Processing staff implied role: ${s.getEmail()}/${impliedRoleName}`) // DEBUG

      const manager = mngrProtocol === 'self'
        ? s.getEmail()
        : mngrProtocol === 'same'
          ? rec.manager
          : throw new Error(`Unkown (or undefined?) manager protocol '${mngrProtocol}' found while processing staff.`)
      const impliedRec = { name : impliedRoleName, manager }

      roles.push(convertRoleToAttached({ staffMember : s, rec : impliedRec, role : impliedRole, org, impliedBy : role, display }))
      processImpliedRoles(roles, s, impliedRec, impliedRole, org)
    } // duplicate test
  } // implies loop
}

// Setup 'zeroRes' matchers for 'checkCondition'. If matching parameters are missing, treated as false rather than an
// error
const roleRe = /^HAS_[A-Z_]+_ROLE$/
const staffParameters = ['^USES_CENTRALIZED_ANTIVIRUS$', '^USES_CENTRALIZED_FIREWALL$']
const zeroRes = staffParameters.map(p => new RegExp(p))
zeroRes.push(roleRe)

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Staff targets in
* an audit.
*/
const checkCondition = (condition, member) => {
  const parameters = Object.assign(
    {
      SEC_TRIVIAL : 1,
      ALWAYS      : 1,
      NEVER       : 0
    },
    member.parameters)

  // TODO: test if leaving it 'true'/'false' works.
  parameters.IS_EMPLOYEE = member.getEmploymentStatus() === 'employee' ? 1 : 0
  parameters.IS_CONTRACTOR = member.getEmploymentStatus() === 'contractor' ? 1 : 0

  member.getRoleNames().forEach(role => {
    parameters[`HAS_${role.toUpperCase().replace(/ /g, '_')}_ROLE`] = 1
  })

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Staff.checkCondition = checkCondition

export { Staff }
