import { Resources } from '../lib/resources.js'

const keyField = 'name'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'TechnologiesAPI' to simplify
* testing.
*/
const Technologies = class extends Resources {
  constructor(items) {
    super({ items, keyField })
  }
}

export { Technologies }
