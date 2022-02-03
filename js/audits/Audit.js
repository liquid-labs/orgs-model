import { Item } from '../lib/Item'

const Audit = class extends Item {
  constructor(data, options) {
    super(data, Object.assign(options, {
      keyField : 'name'
    }))
  }
}

export { Audit }
