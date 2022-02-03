import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'Technologies' to simplify
* testing.
*/
const Audits = class extends Resources {
  constructor(options) {
    super(Object.assign(options, {
      indexes      : [{ indexField : 'target', relationship : idxType.ONE_TO_MANY }],
      itemName     : 'audit',
      keyField     : 'name',
      resourceName : 'audits'
    }))
  }
}

export { Audits }
