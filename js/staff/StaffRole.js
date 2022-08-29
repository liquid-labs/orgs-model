import { bindCreationConfig } from '../lib/Item'
import { Role } from '../roles'

const StaffRole = class extends Role {
  #memberEmail
  #org

  constructor(data, { org, memberEmail, ...rest }) {
    super(
      // the 'data' is just the staff role data, which is incomplete; so we retrieve the 'Role' data and merge
      Object.assign(org.roles.get(data.name, { fuzzy : true, rawData : true }), data), // data
      Object.assign({ org }, rest)// options
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
    throw new Error(`Could not determine manager role for '${this.memberEmail}' role '${this.name}'; though did identify manager: ${this.managerEmail}`)
  }

  get memberEmail() { return this.#memberEmail }

  get getQualifiedName() { return `${this.qualifier} ${this.name}` }

  get isActing() { return this.rawData.acting }

  static validateData({ data, errors = [], memberEmail, org }) {
    if (!data.name) {
      errors.push(validationMsg({
        name   : data.name,
        memberEmail,
        reason : 'is missing required field \'name\''
      }))
      return errors
    }
    // else: data.name is good
    
    const orgRole = org.roles.get(data.name, { fuzzy : true, rawData : true })
  
    if (orgRole === undefined) {
      errors.push(validationMsg({ name : data.name, memberEmail, reason : 'references an invalid role' }))
      return errors
    }
    else if (orgRole.qualifiable !== true && data.qualifier) {
      errors.push(validationMsg({
        name   : data.name,
        memberEmail,
        reason : `specifies qualifier '${data.qualifier}', but the role is not qualifiable`
      }))
    }

    if (!orgRole.designated && !data.manager && !orgRole.selfManaged) {
      errors.push(validationMsg({
        name: data.name,
        memberEmail,
        reason: `does not specify a manager for managed role '${orgRole.name}'`
          + (orgRole.name !== data.name ? `('${data.name}')` : '')
      }))
    }
    else if (!orgRole.designated && !orgRole.selfManaged) {
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
