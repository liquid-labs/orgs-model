import { Item, bindCreationConfig } from '../lib/Item'

const AuditRecord = class extends Item { }

bindCreationConfig({
  itemClass    : AuditRecord,
  itemName     : 'audit record',
  keyField     : 'id',
  resourceName : 'audit records'
})

export { AuditRecord }
