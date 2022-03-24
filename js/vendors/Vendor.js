import { Item, bindCreationConfig } from '../lib/Item'

const Vendor = class extends Item { }

const itemConfig = bindCreationConfig({
  dataCleaner  : (data) => { delete data.id; return data },
  itemClass    : Vendor,
  itemName     : 'vendor',
  keyField     : 'legalName',
  resourceName : 'vendors'
})

export { Vendor }
