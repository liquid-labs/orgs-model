import { Role } from '../roles'

const StaffRole = class extends Role {
  #data
  #memberEmail
  #org
  
  constructor({ org, data, memberEmail }) {
    super(org.roles.getData(data.name))
    this.#data = data
    this.#memberEmail = memberEmail
    this.#org = org
  }

  getManager() { return this.#org.staff.get(this.managerEmail) }
  
  get managerEmail() { return this.#data.manager }

  get memberEmail() { return this.#memberEmail }

  getQualifier() { return this.qualifier }
  
  get qualifier() { return this.#data.qualifier ? this.#data.qualifier : null }

  getQualifiedName() { return `${this.#data.qualifier} ${this.#data.name}` }

  isActing() { return this.acting }
    
  get acting() { return this.#data.acting }
  
  static validateData({ data, errors = [], memberEmail, org }) {
    if (data.name) {
      const orgRole = org.roles.getData(data.name)
      if (orgRole === undefined) {
        throw new Error(validationMsg({ name: data.name, memberEmail, reason: 'references an invalid role' }))
      }
      else if (orgRole.qualifiable !== true && data.qualifier) {
        throw new Error(validationMsg({
          name: data.name,
          memberEmail,
          reason: `specifies qualifier '${data.qualifier}', but the role is not qualifiable`
        }))
      }
    }
    else {
      throw new Error(validationMsg({
        name: data.name,
        memberEmail,
        reason: `is missing required field 'name'`
      }))
    }

    if (data.manager) {
      const manager = org.staff.getData(data.manager)
      if (manager === undefined) {
        throw new Error(validationMsg({
          name: data.name,
          memberEmail,
          reason: `references invalid manager '${data.manager}'`
        }))
      }
    }
    
    return errors
  }
}

const validationMsg = ({ memberEmail, name, reason }) =>
  `Staff role ${name} ${reason}${memberEmail ? ` for member '${memberEmail}'` : ''}.`

export { StaffRole }
