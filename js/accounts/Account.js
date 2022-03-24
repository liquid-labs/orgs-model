import { Item, bindCreationConfig } from '../lib/Item'

const Account = class extends Item { }

bindCreationConfig({
  dataCleaner  : (data) => { delete data.id; return data },
  itemClass    : Account,
  itemName     : 'third-party account',
  keyField     : 'directEmail',
  resourceName : 'third-party accounts'
})

export { Account }
