import { Audit } from './Audit'
import { Resources } from '../lib/Resources'
import * as idxType from '../lib/index-relationships'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'Technologies' to simplify
* testing.
*/
const Audits = class extends Resources {
  constructor(options) {
    super(Object.assign(
      {},
      options,
      { indexes : [{ indexField : 'target', relationship : idxType.ONE_TO_MANY }] }
    ))
  }
}

Object.defineProperty(Audits, 'itemConfig', {
  value        : Audit.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Audits }
