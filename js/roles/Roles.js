import { Evaluator } from '@liquid-labs/condition-eval'

import { Resources } from '../lib/resources'
import { Role } from './Role'

const Roles = class extends Resources {
  constructor({ org, ...rest }) {
    super(rest)

    this.org = org
    this.checkCondition = checkCondition
  }

  get(name, { fuzzy = false, ...options } = {}) {
    const superOptions = fuzzy === true
      // then we need to generate matching options but with required guaranteed false because if there's not an exact
      // match, we'll use the fuzzy matching logic.
      ? Object.assign({}, options, { required : false })
      : options

    let result = super.get(name, superOptions)
    const {
      errMsgGen,
      includeQualifier = false,
      required = false,
      rawData = false
    } = options

    if (includeQualifier === true || (result === undefined && fuzzy === true)) {
      let qualifier
      // now fuzzy match if desired
      if (result === undefined && fuzzy === true) {
        const matchingRoles = this.list({ rawData : true, all : true }).filter((role) => {
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
                // console.error(`qualifier group: ${qualifierGroup}/${qualifier}`) // DEBUG
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

      if (rawData !== true && result) result = new Role(result)

      if (includeQualifier === true) {
        return [result, qualifier]
      }
      else {
        return result
      }
    }

    return result
  }

  getStaffInRole(roleName) {
    return this.org.staff.list({ rawData : true }).filter((s) => s.roles.some((r) => r.name === roleName))
  }

  list({
    all = false,
    includeIndirect = false,
    excludeDesignated = false,
    ...rest
  } = {}) {
    if (all === true || (includeIndirect === true && excludeDesignated === false)) {
      return super.list(rest)
    }

    let filter
    if (includeIndirect === false) {
      const indirectFilter = notImpliedFilterGenerator(this.org.orgStructure)
      filter = excludeDesignated
        ? indirectFilter
        : (r) => indirectFilter(r) || designatedFilter(r)
    }
    else if (excludeDesignated === true) {
      filter = notDesignatedFilter
    }
    // already handled as equiv to 'all' : (includeIndirect === true && excludeDesignated === false)
    else { // theoretically not possible, but included for future robustness
      throw new Error('Could not determine filter for options: ', arguments[0])
    }

    return super.list(rest).filter(filter)
  }
}

const designatedFilter = (role) => role.designated === true
const notDesignatedFilter = (role) => !role.designated

// TODO: do we really have to worry about undefined roles at this point?
const notImpliedFilterGenerator = (orgStructure) => (role) =>
  orgStructure.getNodeByRoleName(role.name)?.implied === false

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

Object.defineProperty(Roles, 'itemConfig', {
  value        : Role.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Roles }
