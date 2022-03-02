import { Item, bindCreationConfig } from '../lib/Item'

const AuditRecord = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass    : AuditRecord,
  itemName     : 'audit record',
  keyField     : 'id',
  resourceName : 'audit records'
})

export { AuditRecord }
