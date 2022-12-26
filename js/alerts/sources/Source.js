import { Item, bindCreationConfig } from '../../lib/Item'

const Source = class extends Item { }

bindCreationConfig({
  dataCleaner  : (data) => { delete data.id; return data },
  itemClass    : Source,
  itemName     : 'external alert source',
  keyField     : 'entityLegalName',
  resourceName : 'external alert sources'
})

export { Source }
