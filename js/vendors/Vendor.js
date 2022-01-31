import { Item } from '../lib/Item'

const Vendor = class extends Item {
  constructor(data) {
    super(data, { keyField : 'legalName' })
  }
}

export { Vendor }
