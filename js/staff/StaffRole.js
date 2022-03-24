import { bindCreationConfig } from '../lib/Item'
import { Role } from '../roles'

const StaffRole = class extends Role {
  #memberEmail
  #org

  constructor(data, { org, memberEmail, ...rest }) {
    super(
      // the 'data' is just the staff role data, which is incomplete; so we retrieve the 'Role' data and merge
      Object.assign(org.roles.get(data.name, { fuzzy : true, rawData : true }), data), // data
      rest // options
    )
    this.#memberEmail = memberEmail
    this.#org = org
  }

  getManager() { return this.#org.staff.get(this.managerEmail) }

  get managerEmail() { return this.manager }

  get managerRole() {
    // TODO: cache?
    const myManager = this.getManager()
    if (myManager === undefined) {
      return undefined // root nodes are unmanaged
    }
    const myNode = this.#org.orgStructure.getNodeByRoleName(this.name)
    for (const { name : managingRoleName } of myNode.getPossibleManagerNodes()) {
      if (myManager.hasRole(managingRoleName)) {
        return managingRoleName
      }
    }
    // Should be impossible...
    throw new Error(`Could not determine manager role for '${this.email}' role '${this.name}'; though did identify manager: ${myManager.name}`)
  }

  get memberEmail() { return this.#memberEmail }

  get getQualifiedName() { return `${this.qualifier} ${this.name}` }

  get isActing() { return this.rawData.acting }

  static validateData({ data, errors = [], memberEmail, org }) {
    if (data.name) {
      const orgRole = org.roles.get(data.name, { fuzzy : true, rawData : true })
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
      const manager = org.staff.get(data.manager, { rawData : true })
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

bindCreationConfig(Object.assign(
  {},
  Role.itemConfig,
  {
    itemClass : StaffRole,
    itemName  : 'staff role'
  }
))

export { StaffRole }
