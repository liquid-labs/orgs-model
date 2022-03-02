import { Item, bindCreationConfig } from '../lib/Item'

const Audit = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass    : Audit,
  itemName     : 'audit',
  keyField     : 'name',
  resourceName : 'audits'
})

export { Audit }
