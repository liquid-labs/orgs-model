import { Role } from '../roles'

const StaffRole = class extends Role {
  #memberEmail
  #org
  
  constructor({ org, data, memberEmail }) {
    super(Object.assign(org.roles.get(data.name, { rawData: true }), data))
    this.#memberEmail = memberEmail
    this.#org = org
  }

  getManager() { return this.#org.staff.get(this.managerEmail) }

  get managerEmail() { return this.rawData.manager }

  get memberEmail() { return this.#memberEmail }

  get getQualifiedName() { return `${this.qualifier} ${this.name}` }

  get isActing() { return this.rawData.acting }

  static validateData({ data, errors = [], memberEmail, org }) {
    if (data.name) {
      const orgRole = org.roles.get(data.name, { rawData: true })
      if (orgRole === undefined) {
        errors.push(validationMsg({ name : data.name, memberEmail, reason : 'references an invalid role' }))
      }
      else if (orgRole.qualifiable !== true && data.qualifier) {
        errors.push(validationMsg({
          name   : data.name,
          memberEmail,
          reason : `specifies qualifier '${data.qualifier}', but the role is not qualifiable`
        }))
      }
    }
    else {
      errors.push(validationMsg({
        name   : data.name,
        memberEmail,
        reason : 'is missing required field \'name\''
      }))
    }

    if (data.manager) {
      const manager = org.staff.get(data.manager, { rawData: true })
      if (manager === undefined) {
        errors.push(validationMsg({
          name   : data.name,
          memberEmail,
          reason : `references invalid manager '${data.manager}'`
        }))
      }
    }

    return errors
  }
}

const validationMsg = ({ memberEmail, name, reason }) =>
  `Staff role ${name} ${reason}${memberEmail ? ` for member '${memberEmail}'` : ''}.`

export { StaffRole }
