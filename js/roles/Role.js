import { Item, bindCreationConfig } from '../lib/Item'

const Role = class extends Item {
  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }
}

bindCreationConfig({
  itemClass    : Role,
  itemName     : 'role',
  keyField     : 'name',
  resourceName : 'roles'
})

export { Role }
