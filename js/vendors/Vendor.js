import { Item } from '@liquid-labs/resource-model'

const Vendor = class extends Item { }

Item.bindCreationConfig({
  dataCleaner : (data) => { delete data.id; return data },
  itemClass   : Vendor,
  itemName    : 'vendor',
  keyField    : 'legalName',
  itemsName   : 'vendors'
})

export { Vendor }
