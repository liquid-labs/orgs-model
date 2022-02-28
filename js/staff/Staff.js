import { Evaluator } from '@liquid-labs/condition-eval'

import * as idxType from '../lib/index-relationships'
import { Resources } from '../lib/resources'
import { StaffMember } from './StaffMember'

const Staff = class extends Resources {
  constructor({ org, ...rest }) {
    super(Object.assign(rest, {
      idNormalizer        : (email) => email.toLowerCase(),
      indexes             : [{ indexField : 'employmentStatus', relationship : idxType.ONE_TO_MANY }],
      itemClass           : StaffMember,
      itemCreationOptions : { org },
      itemName            : 'staff member',
      keyField            : 'email',
      dataCleaner         : (item) => { delete item._sourceFileName; delete item.id; return item },
      resourceName        : 'staff'
    }))

    this.org = org
    this.checkCondition = checkCondition
  }

  getByRoleName(role) { return this.list().filter(s => s.hasRole(role)) }

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

export { Staff }
