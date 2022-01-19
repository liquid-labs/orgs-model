import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

const keyField = 'name'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'TechnologiesAPI' to simplify
* testing.
*/
const Audits = class extends Resources {
  /**
  * A custom index of a list of audits grouped by their target type.
  */
  #indexByTarget = {}
  
  constructor(items) {
    super({ items, keyField })
    this.addIndex({
      items,
      indexSpec: {
        index: this.#indexByTarget,
        keyField: 'target',
        relationship: idxType.INDEX_ONE_TO_MANY
      }
    })
  }

  getByTarget(target) {
    return this.#indexByTarget[target] || []
  }
}

export { Audits }
