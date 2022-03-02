import { Item, bindCreationConfig } from '../../lib/Item'

const Source = class extends Item {
  constructor(data, options) {
    super(data, Object.assign({}, creationOptions, options))
  }
}

const creationOptions = bindCreationConfig({
  itemClass: Source,
  itemName: 'external alert source',
  keyField: 'entityLegalName',
  resourceName: 'external alert sources'
})

export { Source }
