import { Item, bindCreationConfig } from '../lib/Item'

const Vendor = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass    : Vendor,
  itemName     : 'vendor',
  keyField     : 'legalName',
  resourceName : 'vendors'
})

export { Vendor }
