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

  get(name, opts) {
    const { required, fuzzy, errMsgGen } = opts || {}
    
    // we always try an exact match first
    let result = this.map[name]
    // now fuzzy match if desired
    if (result === undefined && fuzzy === true) {
      const matchingRoles = this.items.filter((role) => {
        if (name === 'Chief admin officer') console.log(`Testing ${role.name}: ${role.matcher?.pattern}`) // DEBUG
        return role.matcher !== undefined
          && name.match(new RegExp(role.matcher.pattern, 'i'))
          && !(role.matcher.antiPattern && name.match(new RegExp(role.matcher.antiPattern, 'i')))
        })
          
      if (matchingRoles.length === 1) {
        result = matchingRoles[0]
      }
      else if (matchingRoles.length > 1) {
        throw new Error(`Ambiguous role '${name}' matched to '${matchingRoles.map((r) => r.name).join("', '")}'`)
      }
    }
    
    if (result === undefined && required) {
      throw new Error(errMsgGen?.(name) || `Did not find requried role '${name}'.`)
    }
    
    return result
  }

  getStaffInRole(roleName) {
    return this.org.staff.list().filter((s) => s.roles.some((r) => r.name === roleName))
  }

  /**
  * Swaps out the 'super role' name for the actual super role object.
  */
  hydrate() {
    this.items.forEach((role, i) => {
      if (role.superRole !== undefined) {
        const superRole = this.get(role.superRole)
        if (superRole === undefined) { throw new Error(`Could not find super-role '${role.superRole}' for role '${role.getName()}' (entry ${i}).`) }
        role.superRole = superRole
      }
    })

    return this
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
