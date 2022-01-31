import structuredClone from 'core-js-pure/actual/structured-clone'
import { StaffRole } from './StaffRole'

const StaffMember = class {
  #allRoles
  #reportsByRoleName
  #reports

  constructor({ data, org }) {
    const errors = StaffMember.validateData({ data, org })
    if (errors.length > 0) {
      throw new Error(`Invalid data while creating 'staff member'; ${errors.join(' ')}`)
    }
    Object.assign(this, structuredClone(data))

    this.org = org
    this.id = this.email.toLowerCase()
    this.#reportsByRoleName = {}
  }

  getEmail() { return this.email }
  setEmail(v) { this.email = v }

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

  getFamilyName() { return this.familyName }
  setFamilyName(v) { this.familyName = v }

  getGivenName() { return this.givenName }
  setGivenName(v) { this.givenName = v }

  getStartDate() { return this.startDate }
  setStartDate(v) { this.startDate = v }

  getEmploymentStatus() { return this.employmentStatus }
  setEmploymentStatus(v) { this.employmentStatus = v }

  /**
  * Returns the role names granted directly.
  */
  getOwnRoleNames() { return this.roles.map((r) => r.name) }

  getOwnRoles() { return this.roles.map((data) => new StaffRole({ data, memberEmail : this.email, org : this.org })) }

  getAllRoleNames() { return this.allRolesData.map((r) => r.name) }

  hasRole(roleName) {
    return !!this.roles.some((r) => r.name === roleName) // let's avoid building '#allRoles' if we don't have to
      || !!this.allRolesData.some((r) => r.name === roleName)
  }

  getRole(roleName) {
    const data = this.roles.find((r) => r.name === roleName) // let's avoid building '#allRoles' if we don't have to
      || this.allRolesData.find((r) => r.name === roleName)
    if (data === undefined) return undefined
    return new StaffRole({ data, memberEmail : this.email, org : this.org })
  }

  getManagers() {
    return [...new Set(this.roles.map((r) => r.manager))]
  }

  get allRoles() {
    if (this.#allRoles === undefined) this.#initializeAllRoles()
    return this.#allRoles.map((data) => new StaffRole({ data, memberEmail : this.email, org : this.org }))
  }

  get allRolesData() {
    if (this.#allRoles === undefined) this.#initializeAllRoles()
    return structuredClone(this.#allRoles)
  }

  #initializeAllRoles({ memberEmail }) {
    this.#allRoles = this.roles.slice()

    for (let i = 0; i < this.#allRoles.length; i += 1) {
      const staffRole = this.#allRoles[i]
      // verify the role is valid
      const orgRole = this.org.roles.get(staffRole.name,
        {
          required  : true,
          errMsgGen : (name) => `Staff member '${this.email}' claims unknown role '${name}'.`
        })
      for (const { name: impliedRoleName, mngrProtocol } of orgRole.implies || []) {
        // An implied role can come from multiple sources, so let's check if it's already in place
        const impliedStaffRole = this.#allRoles.find((r) => r.name === impliedRoleName)
        if (impliedStaffRole) {
          // we still want to track the implications, so we update the data
          if (!hasOwn(impliedStaffRole, 'impliedBy')) impliedStaffRole.impliedBy = []
          if (!impliedStaffRole.impliedBy.includes(staffRole.name)) { impliedStaffRole.impliedBy.push(staffRole.name) }
          continue
        }

        const impliedOrgRole = this.org.roles.get(impliedRoleName,
          {
            required  : true,
            errMsgGen : (name) => {
              console.error(`Unknown role '${name}'...`)
              return `Role '${orgRole.name}' implies unknown role '${name}' (triggered while processing staff member '${this.email}').`
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
          impliedStaffRoleData.manager = this.email
        }
        else if (mngrProtocol === 'same') {
          impliedStaffRoleData.manager = staffRole.manager
        }
        else {
          throw new Error(`Unknown manager protocol '${mngrProtocol}' in implication for role '${staffRole.name}'.`)
        }
        this.#allRoles.push(impliedStaffRoleData)
      } // implies loop
    }
  }

  getReportsByRoleName(roleName) {
    const cachedReports = this.#reportsByRoleName[roleName]
    if (cachedReports !== undefined) return cachedReports.slice()
    // else, need to build the entry
    const reports = []
    for (const member of this.org.staff.list()) {
      if (member.email !== this.email
          && member.allRolesData.some((r) =>
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
    this.#reports = this.org.staff.list().reduce((reports, member) => {
      if (this.email !== member.email
          && member.getOwnRoles().some((r) => r.managerEmail === this.email)) {
        reports.push(member.email)
      }
      return reports
    }, [])
  }

  getParameters() { return this.parameters }

  static validateData({ data, errors = [], org }) {
    if (!data) {
      errors.push('Data provided to \'staff member\' is not truthy.')
      return errors
    }

    ['email', 'familyName', 'givenName', 'roles', 'startDate', 'employmentStatus'].reduce((acc, field) => {
      if (data[field] === undefined) { acc.push(`Missing required field '${field}' for '${data.email || data.familyName}'`) }
      return acc
    }, errors)
    if (data.roles) {
      for (const roleData of data.roles) {
        StaffRole.validateData({ data : roleData, errors, memberEmail : data.email, org })
      }
    }

    return errors
  }
}

const hasOwn = (obj, fieldName) => Object.getOwnPropertyNames(obj).some((n) => n === fieldName)

export { StaffMember }
