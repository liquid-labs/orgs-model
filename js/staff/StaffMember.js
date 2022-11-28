import { Item, bindCreationConfig } from '../lib/Item'
import structuredClone from 'core-js-pure/actual/structured-clone'
import { StaffRole } from './StaffRole'

const StaffMember = class extends Item {
  #allRoles
  #org
  #reportsByRoleName
  #reports

  constructor(data, { org, ...rest }) {
    super(data, rest)
    const errors = StaffMember.validateData({ data, org })
    if (errors.length > 0) {
      throw new Error(`Invalid data while creating 'staff member'; ${errors.join(' ')}`)
    }

    this.#org = org
    this.#reportsByRoleName = {}
    this.#allRoles = []
    this.#reports = undefined

    // we do this pre-emptively because it has the side effect of setting 'impliedBy' on the StaffRoles; at some point
    // that should probaby be an org function and happen at the org role level.
    initializeAllRoles({ self : this, roles : data.roles, allRoles : this.#allRoles, org : this.#org })
  }

  /**
  * Combines the given and family name (if any) to produce the full name. The default is to display using 'common
  * format'. Supports option field 'officialFormat'. The function does NOT currently support i18n variations, so for
  * now 'common format' is '<first> <last>' and 'officialFormat' is '<last>, <first>'.
  */
  getFullName({ officialFormat = false } = {}) { // TODO: i18n the display order
    const { givenName, familyName } = this

    if (familyName && givenName) {
      if (officialFormat === true) {
        return `${familyName}, ${givenName}`
      }
      else {
        return `${givenName} ${familyName}`
      }
    }
    else if (familyName) {
      return familyName
    }
    else {
      return givenName
    }
  }

  /**
  * Returns the role names granted directly.
  */
  getOwnRoleNames() { return this.roles.map((r) => r.name) }

  /**
  * Returns the roles directly assigned to the staff member. By default will return `Roles` objects unless the
  * `rawData` option is set to true. Setting `excludeDesignated` and `excludeTitular` will result in an error being
  * thrown.
  *
  * Options:
  * - `excludeDesignated`: Exclude designated roles and only return titular roles.
  * - `excludeTitular`: Exclude titular roles and only return designated roles.
  * - `rawData`: Return raw data objects rather than the default `Roles` objects.
  */
  getOwnRoles({ excludeDesignated = false, excludeTitular = false, rawData = false } = {}) {
    if (excludeTitular === true && excludeDesignated === true) {
      throw new Error("Invalid arguments; 'excludeTitular' and 'excludeDesignated' cannot both be positive.")
    }
    
    let roles = rawData === true
      ? [...this.roles]
      : this.roles.map((data) => new StaffRole(data, { memberEmail : this.email, org : this.#org }))
    if (excludeDesignated) {
      roles = roles.filter((r) => !r.designated)
    }
    else if (excludeTitular) {
      roles = roles.filter((r) => r.designated)
    }
    
    return roles
  }

  getAllRoleNames() { return this.getAllRolesData().map((r) => r.name) }

  hasRole(roleName, { ownRolesOnly = false } = {}) {
    return !!this.getRole(roleName, { fuzzy : true, ownRolesOnly, rawData : true })
  }

  getRole(roleName, { fuzzy = false, ownRolesOnly = false, rawData = false } = {}) {
    let roleFilter
    if (fuzzy === true) {
      const orgRole = this.#org.roles.get(roleName, { fuzzy })
      if (orgRole === undefined) {
        return undefined
      }

      const pattern = orgRole?.matcher?.pattern
      if (pattern) {
        const regex = new RegExp(pattern)
        roleFilter = (r) => r.name === roleName || r.name.match(regex)
      }
      else {
        roleFilter = (r) => r.name === roleName
      }
    }
    else {
      roleFilter = (r) => r.name === roleName
    }
    const data = this.roles.find(roleFilter) // let's avoid building '#allRoles' if we don't have to
      || (!ownRolesOnly && this.getAllRolesData().find(roleFilter))

    if (!data) {
      return undefined
    }
    return rawData === true
      ? structuredClone(data)
      : new StaffRole(data, { memberEmail : this.email, org : this.#org })
  }

  getManagers() {
    return [...new Set(this.roles.map((r) => r.manager))]
  }

  get allRoles() {
    return this.getAllRolesData()
  }

  getAllRoles() {
    if (this.#allRoles.length === 0) {
      initializeAllRoles({ self : this, roles : this.data.roles, allRoles : this.#allRoles, org : this.#org })
    }
    return this.#allRoles.map((data) => new StaffRole(data, { memberEmail : this.email, org : this.#org }))
  }

  // TODO: take 'rawData' option in 'allRoles'
  getAllRolesData() {
    if (this.#allRoles.length === 0) {
      initializeAllRoles({ self : this, roles : this.data.roles, allRoles : this.#allRoles, org : this.#org })
    }
    return structuredClone(this.#allRoles)
  }

  getReportsByRoleName(roleName) {
    const cachedReports = this.#reportsByRoleName[roleName]
    if (cachedReports !== undefined) return cachedReports.slice()
    // else, need to build the entry
    const reports = []
    for (const member of this.#org.staff.list()) {
      if (member.email !== this.email
          && member.getAllRolesData().some((r) =>
            r.name === roleName && r.manager === this.email)) {
        reports.push(member.email)
      }
    }
    this.#reportsByRoleName[roleName] = reports
    return reports.slice()
  }

  getReports() {
    if (this.#reports === undefined) this.#initializeReports()
    return this.#reports.slice()
  }

  #initializeReports() {
    this.#reports = this.#org.staff.list().reduce((reports, member) => {
      if (this.email !== member.email
          && member.getOwnRoles().some((r) => r.managerEmail === this.email)) {
        reports.push(member.email)
      }
      return reports
    }, [])
  }

  static validateData({ data, errors = [], org }) {
    if (!data) {
      errors.push('Data provided to \'staff member\' is not truthy.')
      return errors
    }

    const requireFields = (fields, errMsgFunc) => {
      fields.reduce((acc, field) => {
        const value = data[field]
        if (value === undefined
            || value === null
            || value === ''
            || (Array.isArray(value) && value.length === 0)
        ) {
          acc.push(errMsgFunc(field, data))
        }
        return acc
      }, errors)

      return errors // TODO: I don't think this is necessary
    }

    requireFields(
      ['email', 'employmentStatus'],
      (field, data) => `'${data.email || data.familyName}' is missing or has empty required field '${field}'.`
    )

    const { employmentStatus, roles } = data

    if (employmentStatus !== 'logical') {
      requireFields(
        ['givenName', 'roles'],
        (field, data) =>
          `'${data.email || data.familyName}' is missing or has empty field '${field}' required for non-logical staff.`
      )
      // By the time we get here, the staff has been fleshed out and will have the implied staff + contractor/employee
      // roles. We want to check that there is *some* other role.
      const assignedRoles = (data.roles || [])
        .filter((r) => !(r.name === 'Staff' || r.name === 'Employee' || r.name === 'Contractor'))
      if (assignedRoles.length === 0) {
        errors.push(`${data.givenName}${data.familyName ? ' ' + data.familyName : ''} <${data.email}> has no assigned roles (only implicit roles).`)
      }
    }

    for (const roleData of roles || []) {
      StaffRole.validateData({ data : roleData, errors, memberEmail : data.email, org })
    }

    return errors
  } // end static validateData
} // end class StaffMember

const initializeAllRoles = ({ self, roles, allRoles, org }) => {
  const frontier = [...roles]
  allRoles.push(...roles)

  while (frontier.length > 0) {
    const staffRole = frontier.shift()
    // for (let i = 0; i < allRoles.length; i += 1) {
    // const staffRole = allRoles[i]
    if (!hasOwn(staffRole, 'impliedBy')) {
      staffRole.impliedBy = []
    }
    // verify the role is valid
    const orgRole = org.roles.get(staffRole.name,
      {
        fuzzy     : true,
        required  : true,
        errMsgGen : (name) => `Staff member '${self.email}' claims unknown role '${name}'.`
      })
    const impliedRoles = []
    if (orgRole.implies !== undefined) {
      impliedRoles.push(...orgRole.implies)
    }
    if (orgRole.superRole) {
      impliedRoles.push({ name : orgRole.superRole, mngrProtocol : 'same' })
    }

    for (const { name: impliedRoleName, mngrProtocol } of impliedRoles) {
      // An implied role can come from multiple sources, so let's check if it's already in place
      const impliedStaffRole = allRoles.find((r) => r.name === impliedRoleName)
      if (impliedStaffRole) {
        // we still want to track the implications, so we update the data
        if (!hasOwn(impliedStaffRole, 'impliedBy')) impliedStaffRole.impliedBy = []
        if (!impliedStaffRole.impliedBy.includes(staffRole.name)) { impliedStaffRole.impliedBy.push(staffRole.name) }
        continue
      }

      const impliedOrgRole = org.roles.get(impliedRoleName,
        {
          required  : true,
          errMsgGen : (name) => {
            return `Role '${orgRole.name}' implies unknown role '${name}' (triggered while processing staff member '${self.email}').`
          }
        })
      const impliedStaffRoleData = {
        name      : impliedOrgRole.name,
        impliedBy : [staffRole.name]
      }
      for (const inheritedField of ['acting', 'display', 'tbd']) {
        if (staffRole[inheritedField] !== undefined) {
          impliedStaffRoleData[inheritedField] = staffRole[inheritedField]
        }
      }

      if (mngrProtocol === 'self') {
        impliedStaffRoleData.manager = self.email
      }
      else if (mngrProtocol === 'same') {
        impliedStaffRoleData.manager = staffRole.manager
      }
      else if (impliedOrgRole.titular === true) {
        throw new Error(`Unknown manager protocol '${mngrProtocol}' in implication '${impliedRoleName}' for role '${staffRole.name}'.`)
      }
      allRoles.push(impliedStaffRoleData)
      frontier.push(impliedStaffRoleData)
    } // implies loop
  } // frontier loop
}

const defaultFields = [
  'email',
  'familyName',
  'givenName',
  'roles',
  'startDate',
  'employmentStatus'
]

bindCreationConfig({
  allowSet    : ['familyName', 'givenName', 'roles'],
  dataCleaner : (data) => {
    delete data._sourceFileName
    delete data.id
    const { employmentStatus } = data
    if (employmentStatus === 'employee' || employmentStatus === 'contractor') {
      // Note the use of 'reduceRight' so that we get the higher index first, which is important when we delete them.
      const indexes = data.roles.reduceRight((acc, r, i) => {
        if (r.name === 'Staff' || r.name === 'Employee' || r.name === 'Contractor') {
          acc.push(i)
        }
        return acc
      }, [])
      for (const i of indexes) {
        data.roles.splice(i, 1)
      }
    }
    return data
  },
  dataFlattener : (data) => {
    data.roles = data.roles?.map(r => `${r.name}/${r.manager}`).join(';')
    return data
  },
  defaultFields,
  itemClass    : StaffMember,
  itemName     : 'staff member',
  keyField     : 'email',
  resourceName : 'staff'
})

const hasOwn = (obj, fieldName) => Object.getOwnPropertyNames(obj).some((n) => n === fieldName)

export { StaffMember }
