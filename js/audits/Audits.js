import { Resources } from '../lib/resources'

const key = 'name'

/**
* Basic class wrapping technology items. Functionality is split between 'Technology' and 'TechnologiesAPI' to simplify
* testing.
*/
const Audits = class extends Resources {
  constructor(items) {
    super({ items, key })
  }
}

export { Audits }
