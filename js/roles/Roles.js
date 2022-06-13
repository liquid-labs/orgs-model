import { Evaluator } from '@liquid-labs/condition-eval'

import { Resources } from '../lib/resources'
import { Role } from './Role'

const Roles = class extends Resources {
  constructor({ org, additionalItemCreationOptions, ...rest }) {
    super(Object.assign(
      {},
      rest,
      {
        additionalItemCreationOptions : Object.assign({}, additionalItemCreationOptions, { org })
      }
    ))

    this.org = org
    this.checkCondition = checkCondition
  }

  get(name, { fuzzy = false, ...options } = {}) {
    const superOptions = fuzzy === true
      // then we need to generate matching options but with required guaranteed false because if there's not an exact
      // match, we'll use the fuzzy matching logic.
      ? Object.assign({}, options, { required : false, org : this.org })
      : Object.assign({}, options, { org : this.org })

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

      if (rawData !== true && result) result = new Role(result, { org : this.org })

      if (includeQualifier === true) {
        return [result, qualifier]
      }
      else {
        return result
      }
    }

    return result
  }

  // TODO: the convention here is reversed; in StaffMember.hasRole(), the option is 'ownRole' which defaults false.
  // TODO: this is also idiomatic by returning data objects by default rather than the full class
  getStaffInRole(roleName, { impliedRoles = false, excludeLogical = false } = {}) {
    const filters = []
    if (impliedRoles === true) {
      filters.push((s) => s.hasRole(roleName))
    }
    else { // requires 'own' role
      filters.push((s) => s.roles.some((r) => r.name === roleName))
    }

    if (excludeLogical === true) {
      filters.push(({ employmentStatus }) => employmentStatus !== 'logical')
    }

    return this.org.staff.list()
      .filter((s) => {
        for (const f of filters) {
          if (!f(s)) {
            return false
          }
        }
        return true
      })

    /*    return impliedRoles === true
      ? this.org.staff.list()
          .filter((s) => s.hasRole(roleName))
          .map((s) => s.data)
          // .filter((s, i, l) => l.indexOf(s) === i) // the same person can trigger with different roles, so we uniq-ify
      : this.org.staff.list({ rawData : true }).filter((s) => s.roles.some((r) => r.name === roleName)) */
  }

  /**
  * Options:
  * - `all`: equivalent to `includeIndirect=true`, `excludeDesignated=false`, and `excludeStaff=false`.
  * - `excludeDesignated`: if true, only include titular roles. Incompatible with `excludeTitular`.
  * - `excludeStaff`: if true, excludes the the global, implicit 'staff' role.
  * - `excludeTitular`: if true, only includes designated roles. Incompatible with `excludeDesignated`.
  * - `includeIndirect`: if true, include indirect roles which may be defined by the system but are never directly assigned to staff members.
  */
  list({
    all = false,
    excludeDesignated = false,
    excludeStaff = false,
    excludeTitular = false,
    includeIndirect = false,
    sortEmploymentStatusFirst = false,
    ...listOptions
  } = {}) {
    if (excludeTitular === true && excludeDesignated === true) {
      throw new Error('Incompatible options; \'excludeTitular\' and \'excludeDesignated\' cannot both be true.')
    }

    if (sortEmploymentStatusFirst === true) {
      listOptions.sortFunc = employmentSorter
    }

    if (all === true || (includeIndirect === true && excludeDesignated === false && excludeStaff === true)) {
      return super.list(listOptions)
    }
    const filters = []

    if (includeIndirect === false) {
      const indirectFilter = notImpliedTitularFilterGenerator(this.org.orgStructure)
      filters.push(indirectFilter)
    }
    if (excludeDesignated) {
      filters.push(notDesignatedFilter)
    }
    if (excludeStaff) {
      filters.push(excludeStaffFilter)
    }
    if (excludeTitular) {
      filters.push(notTitularFilter)
    }
    // it's included if no one vetos it.
    const filter = (r) => {
      return !filters.some((f, i) => {
        return f(r) === false
      })
    }

    return super.list(listOptions).filter(filter)
  }
}

const notDesignatedFilter = (role) => !role.designated
const notTitularFilter = (role) => !role.titular

const notImpliedTitularFilterGenerator = (orgStructure) => (role) => {
  if (role.designated === true) return true
  const node = orgStructure.getNodeByRoleName(role.name)
  const result = !!node && (node && !node.implied)// !!role.designated || !!node
  // console.log(`testing ${role.name}:\n  node:     ${!!node}; not implied: ${!node.implied} designated? ${role.designated}; node: ${node}\nresult: ${result}`)
  // console.log(`testing ${role.name}: ${new String(result).toUpperCase()}\n  node:     ${!!node}; not implied: ${node ? !node.implied : '-'}\n`)
  return result
  // !role.designated && orgStructure.getNodeByRoleName(role.name)
}

const excludeStaffFilter = (r) => {
  const { name } = r
  return !(name === 'Staff' || name === 'Employee' || name === 'Contractor')
}

const employmentSorter = (a, b) => {
  const aName = a.name
  const bName = b.name
  if (aName === bName) { // I don't think this ever happens, but just in case
    return 0
  }
  if (aName === 'Staff') {
    return -1
  }
  if (bName === 'Staff') {
    return 1
  }
  if (aName === 'Employee') { // we know bName isn't 'Staff'
    return -1
  }
  if (bName === 'Employee') { // we know aName isn't 'Staff'
    return 1
  }
  if (aName === 'Contractor') { // we know bName isn't 'Staff' or 'Employee'
    return -1
  }
  if (bName === 'Contractor') { // we know aName isn't 'Staff' or 'Employee'
    return 1
  }
  else {
    return aName.localeCompare(bName)
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

Object.defineProperty(Roles, 'itemConfig', {
  value        : Role.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Roles }
