import { Resources } from '../lib/resources'

const key = 'legalName'

/**
* Basic class wrapping vendor items. Functionality is split between 'Vendors' and 'VendorsAPI' to simplify testing.
*/
const Vendors = class extends Resources {
  constructor(items) {
    super({ items, key })
    this.indexCommon = this.items.reduce((index, item) => {
      const { commonName } = item
      const list = index[commonName] || []
      list.push(item)
      index[commonName] = list
      return index
    }, {})
  }

  getByCommonName(commonName) {
    return this.indexCommon[commonName] || []
  }
}

export { Vendors }
