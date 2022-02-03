import { Item } from '../lib/Item'

const AuditRecord = class extends Item {
  constructor(data, options) {
    super(data, Object.assign(options, {
      keyField : 'id'
    }))
  }
}

export { AuditRecord }
