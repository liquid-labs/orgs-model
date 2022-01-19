import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

const keyField = 'legalName'

/**
* Basic class wrapping vendor items. Functionality is split between 'Vendors' and 'VendorsAPI' to simplify testing.
*/
const Vendors = class extends Resources {
  #indexByCommonName = {}
  
  constructor(items) {
    super({ items, keyField })
    this.addIndex({
      items,
      indexSpec: {
        index: this.#indexByCommonName,
        keyField: 'commonName',
        relationship: idxType.ONE_TO_MANY
      }
    })
  }

  getByCommonName(commonName) {
    return this.#indexByCommonName[commonName] || []
  }
}

export { Vendors }
