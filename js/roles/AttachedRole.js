import { Role } from './Role'

const AttachedRole = class extends Role {
  constructor(baseRole, rec, manager, staffMember) {
    super(baseRole)
    if (!baseRole.isQualifiable() && rec.qualifier !== undefined) {
      throw new Error(`Attempt to qualify non-qualifiable role '${baseRole.getName()}' `
                      + `for staff member '${staffMember.getEmail()}'.`)
    }

    Object.assign(this, rec)
    this.manager = manager
  }

  getManager() { return this.manager }

  getManagerRole() { return this.managerRole }

  getQualifier() { return this.qualifier ? this.qualifier : null }

  getQualifiedName() { return `${this.getQualifier()} ${this.getName()}` }

  isActing() { return !!this.acting }
}

export { AttachedRole }
