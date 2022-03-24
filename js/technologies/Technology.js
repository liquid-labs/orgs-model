import { Item, bindCreationConfig } from '../lib/Item'

const Technology = class extends Item { }

bindCreationConfig({
  dataCleaner  : (data) => { delete data.id; return data },
  itemClass    : Technology,
  itemName     : 'technology',
  keyField     : 'name',
  resourceName : 'technologies'
})

export { Technology }
