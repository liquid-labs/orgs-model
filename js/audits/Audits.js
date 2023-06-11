import { idxType, ItemManager } from '@liquid-labs/resource-model'

import { Audit } from './Audit'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'Technologies' to simplify
* testing.
*/
const Audits = class extends ItemManager {
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
