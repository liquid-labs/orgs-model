import { Item, bindCreationConfig } from '../lib/Item'

const Audit = class extends Item { }

bindCreationConfig({
  itemClass    : Audit,
  itemName     : 'audit',
  keyField     : 'name',
  resourceName : 'audits'
})

export { Audit }
