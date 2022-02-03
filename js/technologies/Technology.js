import { Item } from '../lib/Item'

const Technology = class extends Item {
  constructor(data) {
    super(data, { keyField : 'name' })
  }
}

export { Technology }
