import * as indexes from './index-funcs.js'
import * as relationship from './index-relationships.js'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  #indexById = {}
  #indexSpecs = []
  
  constructor({ items, keyField }) {
    this.items = items || []
    // add standard 'id' field if not present.
    this.items.forEach((item) => { item.id = item.id || item[keyField] })

    this.addIndex({
      items,
      indexSpec: {
        index: this.#indexById,
        keyField: 'id',
        relationship: relationship.ONE_TO_ONE
      }
    })
  }
  
  addIndex({ items, indexSpec }) {
    this.#indexSpecs.push(indexSpec)
    indexes.rebuild({ items, indexSpec })
  }

  add(item) {
    if (this.#indexById[item.id] !== undefined) {
      throw new Error(`Cannot add item with existing key '${item.id}'; try 'update'.`)
    }

    this.items.push(item)
    
    indexes.addItem({ item, indexSpecs: this.#indexSpecs })
  }

  /**
  * Retrieves a single vendor/product entry by name.
  */
  get(name, { required = false } = {}) {
    const result = this.#indexById[name]
    if (required === true && result === undefined) {
      throw new Error(`Did not find required vendor '${name}'.`)
    }

    return Object.assign({}, result)
  }
  
  update(item) {
    if (this.#indexById[item.id] === undefined) {
      throw new Error(`No such item with key '${item.id}' to update; try 'add'.`)
    }
    
    const itemIndex = this.indexOf(item)
    this.items.splice(itemIndex, 1, item)
    
    indexes.updateItem({ item, indexSpecs: this.#indexSpecs })
    
    return item
  }
  
  delete(itemId) {
    const item = this.#indexById[itemId]
    if (item === undefined) {
      throw new Error(`No such item with id '${item.id}' found.`)
    }
    
    const itemIndex = this.indexOf((i) => i.id === item.id)
    this.items.splice(itemIndex, 1)
    
    indexes.deleteItem({ item, indexSpecs: this.#indexSpecs })
  }

  key() { return this.key }

  list({ sort = this.key } = {}) {
    return sort
      ? this.items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
      : this.items
  }
}

const commonAPIInstanceSetup = ({ self, org, checkCondition }) => {
  self.org = org
  self.hydrationErrors = [] // list of: { ref: ..., sourceName: ..., sourceType: ..., advice?: ...}
  // e.g.: { ref: "bad-audit-name", sourceName: "Acme Vendor", "sourceType": "vendor" }
  self.checkCondition = checkCondition
}

export {
  commonAPIInstanceSetup,
  Resources
}
