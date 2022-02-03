import { Item } from '../lib/Item'

const Account = class extends Item {
  constructor(data, options) {
    super(data, Object.assign(options, { keyField : 'directEmail' }))
  }
}

export { Account }
