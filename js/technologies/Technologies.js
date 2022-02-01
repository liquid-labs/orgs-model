import { Resources } from '../lib/resources'
import { Technology } from './Technology'

const keyField = 'name'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'TechnologiesAPI' to simplify
* testing.
*/
const Technologies = class extends Resources {
  constructor(items) {
    super({ itemClass : Technology, itemName : 'technology', items, keyField, resourceName : 'technologies' })
  }
}

export { Technologies }
