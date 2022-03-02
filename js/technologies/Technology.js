import { Item, bindCreationConfig } from '../lib/Item'

const Technology = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass    : Technology,
  itemName     : 'technology',
  keyField     : 'name',
  resourceName : 'technologies'
})

export { Technology }
