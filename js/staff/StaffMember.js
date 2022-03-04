import { Item, bindCreationConfig } from '../lib/Item'
import structuredClone from 'core-js-pure/actual/structured-clone'
import { StaffRole } from './StaffRole'

const StaffMember = class extends Item {
  #allRoles
  #org
  #reportsByRoleName
  #reports

  constructor(data, { org, ...rest }) {
    super(data, Object.assign({}, creationOptions, rest))
    const errors = StaffMember.validateData({ data, org })
    if (errors.length > 0) {
      throw new Error(`Invalid data while creating 'staff member'; ${errors.join(' ')}`)
    }

    this.#org = org
    this.#reportsByRoleName = {}
    this.#allRoles = []
    this.#reports = undefined
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

  getOwnRoles({ rawData = false } = {}) {
    return rawData === true
      ? [...this.roles]
      : this.roles.map((data) => new StaffRole(data, { memberEmail : this.email, org : this.#org }))
  }

  getAllRoleNames() { return this.getAllRolesData().map((r) => r.name) }

  hasRole(roleName) {
    return !!this.roles.some((r) => r.name === roleName) // let's avoid building '#allRoles' if we don't have to
      || !!this.getAllRolesData().some((r) => r.name === roleName)
  }

  getRole(roleName) {
    const data = this.roles.find((r) => r.name === roleName) // let's avoid building '#allRoles' if we don't have to
      || this.getAllRolesData().find((r) => r.name === roleName)
    if (data === undefined) {
      return undefined
    }
    return new StaffRole(data, { memberEmail : this.email, org : this.#org })
  }

  getManagers() {
    return [...new Set(this.roles.map((r) => r.manager))]
  }

  getAllRoles() {
    if (this.#allRoles.length === 0) {
      // because this is a getter, it apparently breaks the proxy chain...
      initializeAllRoles({ self : this, roles : this.data.roles, allRoles : this.#allRoles, org : this.#org })
    }
    return this.#allRoles.map((data) => new StaffRole(data, { memberEmail : this.email, org : this.#org }))
  }

  // TODO: take 'rawData' option in 'allRoles'
  getAllRolesData() {
    if (this.#allRoles.length === 0) { initializeAllRoles({ self : this, roles : this.data.roles, allRoles : this.#allRoles, org : this.#org }) }
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
        if (data[field] === undefined) acc.push(errMsgFunc(field, data))
        return acc
      }, errors)
    }

    requireFields(
      ['email', 'employmentStatus'],
      (field, data) => `'${data.email || data.familyName}' is missing required field '${field}'.`
    )

    const { employmentStatus, roles } = data

    if (employmentStatus !== 'logical') {
      requireFields(
        ['familyName', 'givenName', 'roles', 'startDate'],
        (field, data) =>
          `'${data.email || data.familyName}' is missing field '${field}' required for non-logical staff.`
      )
    }

    for (const roleData of roles || []) {
      StaffRole.validateData({ data : roleData, errors, memberEmail : data.email, org })
    }

    return errors
  }
}

const initializeAllRoles = ({ self, roles, allRoles, org }) => {
  allRoles.push(...roles)

  for (let i = 0; i < allRoles.length; i += 1) {
    const staffRole = allRoles[i]
    // verify the role is valid
    const orgRole = org.roles.get(staffRole.name,
      {
        fuzzy     : true,
        required  : true,
        errMsgGen : (name) => `Staff member '${this.email}' claims unknown role '${name}'.`
      })
    for (const { name: impliedRoleName, mngrProtocol } of orgRole.implies || []) {
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
            console.error(`Unknown role '${name}'...`)
            return `Role '${orgRole.name}' implies unknown role '${name}' (triggered while processing staff member '${self.data.email}').`
          }
        })
      const impliedStaffRoleData = {
        name      : impliedOrgRole.name,
        impliedBy : [staffRole.name]
      }
      for (const inheritedField of ['acting', 'display', 'tbd']) {
        if (staffRole[inheritedField] !== undefined) { impliedStaffRoleData[inheritedField] = staffRole[inheritedField] }
      }
      if (mngrProtocol === 'self') {
        impliedStaffRoleData.manager = self.data.email // remember, the proxy chain is broken
      }
      else if (mngrProtocol === 'same') {
        impliedStaffRoleData.manager = staffRole.manager
      }
      else {
        throw new Error(`Unknown manager protocol '${mngrProtocol}' in implication for role '${staffRole.name}'.`)
      }
      allRoles.push(impliedStaffRoleData)
    } // implies loop
  }
}

const creationOptions = bindCreationConfig({
  allowSet     : ['familyName', 'givenName', 'roles'],
  dataCleaner  : (item) => { delete item._sourceFileName; delete item.id; return item },
  itemClass    : StaffMember,
  itemName     : 'staff member',
  keyField     : 'email',
  resourceName : 'staff'
})

const hasOwn = (obj, fieldName) => Object.getOwnPropertyNames(obj).some((n) => n === fieldName)

export { StaffMember }
