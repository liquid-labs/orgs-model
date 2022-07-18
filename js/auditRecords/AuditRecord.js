import { Item, bindCreationConfig } from '../lib/Item'

const AuditRecord = class extends Item { }

/* TODO: move 'stauts', 'info', 'todo', and 'asOf' in 'auditRecords' to 'records', an array sorted by timestamp.; eg:
* {
*   id,
*   ...,
*   records: [ { status, info, todo, asOf }, ... ]
}
*/

bindCreationConfig({
  itemClass    : AuditRecord,
  itemName     : 'audit record',
  keyField     : 'id',
  resourceName : 'audit records'
})

export { AuditRecord }
