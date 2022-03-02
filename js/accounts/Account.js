import { Item, bindCreationConfig } from '../lib/Item'

const Account = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass    : Account,
  itemName     : 'third-party account',
  keyField     : 'directEmail',
  resourceName : 'third-party accounts'
})

export { Account }
