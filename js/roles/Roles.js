import { Evaluator } from '@liquid-labs/condition-eval'

import { Role } from './Role'

const Roles = class {
  constructor(org, rolesData) {
    this.org = org

    this.items = rolesData.map((rec) => new Role(rec))
    this.map = this.items.reduce((acc, role, i) => {
      if (acc[role.getName()] !== undefined) {
        throw new Error(`Role with name '${role.name}' already exists at entry ${i}.`)
      }
      acc[role.getName()] = role
      return acc
    }, {})

    this.checkCondition = checkCondition
    this.key = 'name'
  }

  // TODO: deprecated
  getAll() { return this.items.slice() }
  list() { return this.items.slice() }

  getData(name) { return this.map[name] }
  /**
  * ### Parameters
  *
  * - `includeQualifier`: returns an array `'[ role, qualifier ]'`
  */
  get(name, {
    errMsgGen,
    fuzzy = false,
    includeQualifier = false,
    required = false
  } = {}) {
    // we always try an exact match first
    let result = this.map[name]
    let qualifier = null
    // now fuzzy match if desired
    if (result === undefined && fuzzy === true) {
      const matchingRoles = this.items.filter((role) => {
        if (role.matcher !== undefined) {
          const { antiPattern, pattern, qualifierGroup } = role.matcher
          const match = name.match(new RegExp(pattern, 'i'))
          if (match) {
            // check anti-pattern first and bail out to avoid setting qualifier for disqualified match
            if (antiPattern && name.match(new RegExp(antiPattern, 'i'))) {
              return false
            }

            if (qualifierGroup) {
              qualifier = match[qualifierGroup]
              console.error(`qualifier group: ${qualifierGroup}/${qualifier}`)
            }
            return true
          }
        }
        return false
      })
      
      if (matchingRoles.length === 1) {
        result = matchingRoles[0]
      }
      else if (matchingRoles.length > 1) {
        throw new Error(`Ambiguous role '${name}' matched to '${matchingRoles.map((r) => r.name).join("', '")}'`)
      }
    }

    if (result === undefined && required === true) {
      throw new Error(errMsgGen?.(name) || `Did not find requried role '${name}'.`)
    }

    if (includeQualifier === true) {
      return [ new Role(result), qualifier]
    }
    else {
      return new Role(result)
    }
  }

  getStaffInRole(roleName) {
    return this.org.staff.list().filter((s) => s.roles.some((r) => r.name === roleName))
  }
}

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Roles targets in
* an audit.
*/
const checkCondition = (condition, role) => {
  const parameters = Object.assign(
    {
      SEC_TRIVIAL : 1,
      ALWAYS      : 1,
      NEVER       : 0
    },
    role.parameters)

  // TODO: test if leaving it 'true'/'false' works.
  parameters.DESIGNATED = role.designated ? 1 : 0
  parameters.SINGULAR = role.singular ? 1 : 0

  const zeroRes = []

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

export { Roles }
