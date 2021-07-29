const StaffMember = class {
  constructor(record) {
    Object.assign(this, record)

    this.attachedRolesByName = {}
    this.reportsByReportRole = {} // roles keyed to reports role names
  }

  getEmail() { return this.email }
  setEmail(v) { this.email = v }

  /**
  * Combines the given and family name (if any) to produce the full name. The default is to display using 'common
  * format'. Supports option field 'officialFormat'. The function does NOT currently support i18n variations, so for
  * now 'common format' is '<first> <last>' and 'officialFormat' is '<last>, <first>'.
  */
  getFullName({ officialFormat = false }) { // TODO: i18n the display order
    const givenName = this.getGivenName()
    const familyName = this.getFamilyName()
    if (familyName && givenName) {
      if (officialFormat === true) {
        return `${familyName}, ${givenName}`
      }
      else {
        return `${givenName} ${family}`
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

  getRoleNames() { return this.roles.map((r) => r.name) }

  hasRole(roleName) { return !!this.attachedRolesByName[roleName] }

  getAttachedRoles() { return this.roles.slice() }

  getAttachedRole(roleName) { return this.attachedRolesByName[roleName] }

  getManagers() { return this.roles.map((r) => r.manager) }

  getReportsByRoleName(roleName) { return this.reportsByReportRole[roleName] || [] }
  getReports() {
    return Object.values(this.reportsByReportRole).reduce((acc, reps) => acc.concat(reps), [])
      .filter(rep => rep.getEmail() !== this.getEmail())
  }

  getParameters() { return this.parameters }
}

export { StaffMember }
