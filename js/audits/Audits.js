import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

const keyField = 'name'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'TechnologiesAPI' to simplify
* testing.
*/
const Audits = class extends Resources {
  #indexByTarget

  constructor(items) {
    super({ itemName: 'audit', items, keyField, rourceName: 'audits' })
    this.#indexByTarget = this.listManager.addIndex({
      name         : 'byTarget',
      keyField     : 'target',
      relationship : idxType.ONE_TO_MANY
    })
  }

  getByTarget(target, options) {
    return Resources.sort({ ...options,
      items: this.#indexByTarget[target] || []
    })
  }
}

export { Audits }
