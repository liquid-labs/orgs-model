import { Item } from '@liquid-labs/resource-model'

const AuditRecord = class extends Item { }

/* TODO: move 'stauts', 'info', 'todo', and 'asOf' in 'auditRecords' to 'records', an array sorted by timestamp.; eg:
* {
*   id,
*   ...,
*   records: [ { status, info, todo, asOf }, ... ]
}
*/

Item.bindCreationConfig({
  itemClass : AuditRecord,
  itemName  : 'audit record',
  keyField  : 'id',
  itemsName : 'audit records'
})

export { AuditRecord }
