import { Item } from '@liquid-labs/resource-model'

const Audit = class extends Item { }

Item.bindCreationConfig({
  itemClass    : Audit,
  itemName     : 'audit',
  keyField     : 'name',
  itemsName    : 'audits'
})

export { Audit }
