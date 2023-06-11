import { Item } from '@liquid-labs/resource-model'

const Account = class extends Item { }

Item.bindCreationConfig({
  dataCleaner  : (data) => { delete data.id; return data },
  itemClass    : Account,
  itemName     : 'third-party account',
  keyField     : 'directEmail',
  itemsName    : 'third-party accounts'
})

export { Account }
