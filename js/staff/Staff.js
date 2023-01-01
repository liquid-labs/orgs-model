import { Evaluator } from '@liquid-labs/condition-eval'

import * as idxType from '../lib/index-relationships'
import { Resources } from '../lib/Resources'
import { StaffMember } from './StaffMember'

const Staff = class extends Resources {
  constructor({ org, additionalItemCreationOptions, ...rest }) {
    super(Object.assign(
      {},
      rest,
      {
        additionalItemCreationOptions : Object.assign({}, additionalItemCreationOptions, { org }),
        indexes                       : [{ indexField : 'employmentStatus', relationship : idxType.ONE_TO_MANY }]
      }
    ))

    if (!org) throw new Error("Must define 'org' for staff creation.")

    this.org = org
    this.checkCondition = checkCondition
  }

  cleanedData() {
    // return this.list({ rawData: true }).map(StaffMember.itemConfig.dataCleaner)
    return this.list({ rawData: true }).map((s) => {
      return StaffMember.itemConfig.dataCleaner(s)
    })
  }

  get(id, options = {}) {
    const { ownRolesOnly } = options

    bindAugmentor({ allRoles : this.allRoles, options, org : this.org, ownRolesOnly })

    return super.get(id, options)
  }

  /**
  * Options:
  * - `ownRolesOnly`: Only staff who have the role directly assigned are returned.
  */
  getByRoleName(roles, options) {
    if (typeof roles === 'string') {
      roles = [roles]
    }

    return this.list().filter(s => {
      for (const role of roles) {
        if (s.hasRole(role, options)) {
          return true
        }
      }
      return false
    })
  }

  list(options = {}) {
    const { excludeLogical=false, ownRolesOnly=false } = options

    bindAugmentor({ allRoles : this.allRoles, options, org : this.org, ownRolesOnly })

    const list = super.list(options)
    return excludeLogical === true
      ? list.filter((s) => s.employmentStatus !== 'logical')
      : list
  }

  validate({ required = false } = {}) {
    const errors = []
    const list = this.list({ rawData : true })
    for (const data of list) {
      StaffMember.validateData({ data, errors, org : this.org })
    }

    if (errors.length > 0 && required) { throw new Error(`Error${errors.length > 1 ? 's' : ''}: ${errors.join(' ')}`) }

    return errors.length === 0 ? true : errors
  }
}

const bindAugmentor = ({ allRoles, options, org, ownRolesOnly }) => {
  if (ownRolesOnly) {
    options.dataAugmentor = bindAddEmploymentRoles(org)
  }
  else {
    options.dataAugmentor = bindAddAllRoles(org, allRoles)
  }

  return options
}

const bindAddEmploymentRoles = (org) => (data) => {
  const { employmentStatus, roles } = data

  if (employmentStatus !== 'board' && employmentStatus !== 'logical') {
    if (!['employee', 'contractor'].includes(employmentStatus)) {
      throw new Error(`Staff member '${data.email}' has invalid employment status '${employmentStatus}'`)
    }

    // Depending on the flow, the implicit staff roles may already be present
    if (employmentStatus === 'contractor' && !roles.some((r) => r.name === 'Contractor')) {
      roles.push(org.roles.get('Contractor', { rawData : true, required : true }))
    }
    else if (employmentStatus === 'employee' && !roles.some((r) => r.name === 'Employee')) {
      roles.push(org.roles.get('Employee', { rawData : true, required : true }))
    }

    if (!roles.some((r) => r.name === 'Staff')) {
      roles.push(org.roles.get('Staff', { rawData : true, required : true }))
    }
  }

  return data
}

const bindAddAllRoles = (org, allRoles) => (data) => {
  data = bindAddEmploymentRoles(org)(data)

  data.allRoles = allRoles

  return data
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
  parameters.IS_EMPLOYEE = member.employmentStatus === 'employee' ? 1 : 0
  parameters.IS_CONTRACTOR = member.employmentStatus === 'contractor' ? 1 : 0

  member.getOwnRoleNames().forEach(role => {
    parameters[`HAS_${role.toUpperCase().replace(/ /g, '_')}_ROLE`] = 1
  })

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Staff.checkCondition = checkCondition

Object.defineProperty(Staff, 'itemConfig', {
  value        : StaffMember.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Staff }
