import { OrgStructure } from './OrgStructure'
import { JSONLoop } from './lib/JSONLoop'

import { AccountsAPI } from '../accounts'
import { AuditRecordsAPI } from '../auditRecords'
import { Roles } from '../roles'
import { Staff } from '../staff'
import { VendorsAPI } from '../vendors'
import { loadOrgState } from '../lib/org-state'

const Organization = class {
  constructor(dataPath, staffJsonPath) {
    // innerState defines:
    // * thirdPartyAccounts
    this.innerState = loadOrgState(dataPath)

    // TODO: Move all this to 'innerState' (for roles and staff, by loading all with the federated json used in
    // 'loadOrgState') and just use the global hydration.
    this.dataPath = dataPath
    this.roles = new Roles(this, this.innerState.roles)
    this.roles.hydrate()
    this.orgStructure = new OrgStructure(`${dataPath}/orgs/org_structure.json`, this.roles)
    this.staff = new Staff(staffJsonPath)
    this.staff.hydrate(this)

    // hydrate(this)

    this.accounts = new AccountsAPI(this)
    this.auditRecords = new AuditRecordsAPI(this)
    this.audits = this.innerState.audits
    this.vendors = new VendorsAPI(this)
  }

  // TODO: deprecated; just use 'org.roles'
  getRoles() { return this.roles }

  // TODO: deprecated; just use 'org.staff'
  getStaff() { return this.staff }

  getSetting(key) { return process.env[key] }

  requireSetting(key) {
    const value = this.getSetting(key)
    if (value === undefined) { throw new Error(`No such company setting '${key}'.`) }
    return value
  }

  hasStaffInRole(email, roleName) {
    return this.getStaff().getByRoleName(roleName).some(s => s.getEmail() === email)
  }

  getManagingRolesByManagedRoleName(roleName) {
    return this.orgStructure.getNodeByRoleName(roleName).getPossibleMngrs()
  }

  generateOrgChartData(style = 'debang/OrgChart') {
    // Implementation notes:
    // The overall structure is generated per the 'google-chart' style by processing each role of each titular role of
    // each staff member. At the moment, 'google-chart' style is more of an intermediate step than a final format as it
    // does not support the full range of desired features. The resulting data format is:
    //
    //    [ '<individual email>/role', '<manager email>/role', '<role qualifier>' ]

    if (style === 'google-chart') {
      const result = []
      // luckily, the google org chart doesn't care whether we specify the nodes in order or not, so it's a simple
      // transform
      Object.values(this.getStaff().getAll()).forEach(s => {
        s.getAttachedRoles().forEach(r => {
          if (r.isTitular()) {
            const myKey = `${s.getEmail()}/${r.getName()}`
            const manager = s.getAttachedRole(r.getName()).getManager()
            if (!manager) result.push([myKey, '', r.getQualifier()])
            else {
              const mngrEmail = manager.getEmail()
              const managingRoles = this.getManagingRolesByManagedRoleName(r.getName())
              const managingRole = managingRoles.find(mngrRole =>
                this.hasStaffInRole(mngrEmail, mngrRole.getName())
              )
              /* `${mngrEmail}/${r.getName()}` === myKey
                ? r
                : this.getManagingRolesByManagedRoleName(r.getName()).find(mngrRole =>
                    this.hasStaffInRole(mngrEmail, mngrRole.getName())
                  ) */
              if (!managingRole) {
                throw new Error(`Could not find manager ${managingRoles.map(r => `${mngrEmail}/${r.name}`).join('|')} for ${myKey}.`)
              }
              const managerKey = `${mngrEmail}/${managingRole.getName()}`
              result.push([myKey, managerKey, r.getQualifier()])
            }
          }
        })
      })
      // console.error(result) // DEBUG

      return result
    }
    else if (style === 'debang/OrgChart') {
      // Converts array-based/tabular '[staff, manager, qualifier] to a JSON tree, allowing for the same staff member
      // to appear at multiple nodes using conversion algorithm from debang demos: https://codepen.io/dabeng/pen/mRZpLK
      const seedData = this
        .generateOrgChartData('google-chart')
        .map(row => {
          const [email, roleName] = row[0].split(/\//)
          // if there's a qualifier, we create the 'effective' role name here
          const qualifier = row[2]
          const title = qualifier
            ? roleName.replace(/^(Senior )?/, `$1${qualifier} `)
            : roleName
          const role = this.roles.get(roleName)

          const staffMember = this.getStaff().get(email)
          const acting = staffMember.getAttachedRole(roleName).acting
          return {
            id        : row[0],
            ids       : [row[0]],
            parent_id : row[1],
            email     : email,
            name      : staffMember.getFullName(),
            titles    : [title],
            roles     : [role],
            acting
          }
        })
      const data = {}
      const childNodes = []

      // build out the full tree with each titualar role being it's own thing
      let item = undefined
      while ((item = seedData.shift()) !== undefined) {
        if (!item.parent_id) {
          Object.assign(data, item)
        }
        else {
          const jsonloop = new JSONLoop(data, 'id', 'children')
          jsonloop.findNodeById(data, item.parent_id, function(err, node) {
            if (err) { // try deferring the processing till the needed node is defined...
              if (item['_deferredMarker'] === true) {
                throw new Error(`Error finding '${item.parent_id}'; ${err}`)
              }
              else {
                item['_deferredMarker'] = true
                seedData.push(item)
              }
            }
            else {
              childNodes.push(item)
              if (node.children) {
                node.children.push(item)
              }
              else {
                node.children = [item]
              }
            }
          })
        }
      }

      const mergeNodes = (target, source) => {
        target.titles.push(...source.titles)
        target.ids.push(...source.ids)
        target.roles.push(...source.roles)
      }

      // collapse/merge nodes where appropriate
      childNodes.forEach(node => {
        const jsonloop = new JSONLoop(data, 'id', 'children')
        jsonloop.findParent(data, node, (err, parent) => {
          if (err) throw new Error(`Could not find parent for '${node.id}'; is chart valid?`)

          if (parent) {
            // merge sideways
            for (const role of node.roles) {
              /* OK, wanted to do:
              const sibblingsRoleNamesToMerge = role.implies?.filter(impSpec =>
                  impSpec.mngrProtocol === 'same' && node.ids.indexOf(`${node.email}/${impSpec.mergeWith}`) >= 0 )
                .map(i => i.name)

              But eslint chokes... on the question mark? It's not clear. It talks about an undefined range.
              Tried updating eslint and babel components 2021-03-28 with no success.
              TODO: look into this and report bug if nothing found.
              */
              const sibblingsRoleNamesToMerge = role.implies && role.implies.filter(impSpec =>
                impSpec.mngrProtocol === 'same' && node.ids.indexOf(`${node.email}/${impSpec.mergeWith}`) >= 0)
                .map(i => i.name)

              // const trimRoles = (n) => { const { roles, ...rest } = n; return rest; } // DEBUG

              /* if (sibblingsRoleNamesToMerge) {// DEBUG
                console.error(`Side merging to ${node.titles[0]}\n`, sibblingsRoleNamesToMerge)
              } */
              for (const mergeMeName of sibblingsRoleNamesToMerge || []) {
                const key = `${node.email}/${mergeMeName}`
                // console.error(`Looking for '${key}' to merge in: `, parent.children.map(trimRoles))// DEBUG
                const mergeMeNode = parent.children.find(c => c.ids.find(id => id === key))
                if (mergeMeNode) {
                  // console.error('Found: ', trimRoles(mergeMeNode)) // DEBUG
                  mergeNodes(node, mergeMeNode)
                  parent.children.splice(parent.children.findIndex((t) => t === mergeMeNode), 1)
                }
              }
            }

            // merge up
            if (node.email === parent.email) {
              // It may be the case that we have a node with multiple roles and a sub-role has reports. The sub-node
              // will be rendered in order to clarify the nature of the reports, but we hide the email which is
              // appearent in the parent node.
              node.hideName = true

              // collapse staff member roles to same staff in parent role if only child or sub-node has no children.
              if (parent.children.length === 1 || node.children === undefined) {
                mergeNodes(parent, node)
                // If 'node' is only child collapsing into parrent, just cut it out
                if (parent.children.length === 1) parent.children = node.children
                else { // Else, just cut the child out
                  parent.children.splice(parent.children.findIndex((t) => t === node), 1)
                }
              }
            }
          }
        })
      })

      return data
    }
    else throw new Error(`Org chart style '${style}' is not supported.`)
  }
}

export { Organization }
