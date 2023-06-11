import { Item } from '@liquid-labs/resource-model'

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
    const myNormalizedRole = this.#org.roles.get(this.name, { fuzzy : true })
    if (myNormalizedRole === undefined) {
      throw new Error(`Could not determine normalized role for '${this.memberEmail}' role '${this.name}'.`)
    }
    const myNode = this.#org.orgStructure.getNodeByRoleName(myNormalizedRole.name)
    if (myNode === undefined) {
      throw new Error(`Could not determine manager role for '${this.memberEmail}' role '${this.name}'${this.name === myNormalizedRole.name ? '' : ` (normalized name: '${myNormalizedRole.name}')`}; though did identify manager: ${this.managerEmail}; verify the org structure includes '${this.name}'.`)
    }
    for (const { name : managingRoleName } of myNode.getPossibleManagerNodes()) {
      if (myManager.hasRole(managingRoleName)) {
        // then we need to find their own role. We want to allow this to be different because we want the organization
        // of roles to be flexible and minimal. So the org chart may be generic, but the company titles are customized
        // super-types for example.
        for (const managerOwnRole of myManager.getOwnRoles()) {
          if (managerOwnRole.impliesRole(managingRoleName)) {
            return managerOwnRole.name
          }
        }
      }
    }
    // Should be impossible...
    throw new Error(`Could not verify role for '${this.memberEmail}' role '${this.name}'${this.name === myNormalizedRole.name ? '' : ` (normalized name: '${myNormalizedRole.name}')`}; though did identify manager: ${this.managerEmail}; verify the org structure includes '${this.name}'.`)
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
        name   : data.name,
        memberEmail,
        reason : `does not specify a manager for managed role '${orgRole.name}'`
          + (orgRole.name !== data.name ? `('${data.name}')` : '')
      }))
    }
    else if (!orgRole.designated && !orgRole.selfManaged) {
      const manager = org.staff.get(data.manager, { rawData : true })
      if (manager === undefined) {
        errors.push(validationMsg({
          name   : data.name,
          memberEmail,
          reason : `references unknown manager '${data.manager}'`
        }))
      }
    }

    return errors
  }
}

const validationMsg = ({ memberEmail, name, reason }) =>
  `Staff role ${name} ${reason}${memberEmail ? ` for member '${memberEmail}'` : ''}.`

Item.bindCreationConfig(Object.assign(
  {},
  Role.itemConfig,
  {
    itemClass : StaffRole,
    itemName  : 'staff role'
  }
))

export { StaffRole }
