import { Item } from '../lib/Item'

const Role = class extends Item {
  constructor(rec, options) {
    super(rec, Object.assign({}, creationOptions, options))
  }

  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }
}

const creationOptions = {
  itemClass    : Role,
  itemName     : 'role',
  keyField     : 'name',
  resourceName : 'roles'
}
Object.freeze(creationOptions)
Object.defineProperty(Role, 'creationOptions', {
  value: creationOptions,
  writable: false,
  enumerable: true,
  configurable: false
})

export { Role }
