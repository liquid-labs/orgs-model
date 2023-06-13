import { Item } from '@liquid-labs/resource-model'

const Source = class extends Item { }

Item.bindCreationConfig({
  dataCleaner : (data) => { delete data.id; return data },
  itemClass   : Source,
  itemName    : 'external alert source',
  keyField    : 'entityLegalName',
  itemsName   : 'external alert sources'
})

export { Source }
