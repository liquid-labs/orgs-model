import { IndexManager } from './IndexManager.js'
import * as relationships from './index-relationships.js'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  #items
  
  constructor({ items = [], keyField, itemName }) {
    this.#items = items
    // add standard 'id' field if not present.
    this.#items.forEach((item) => { item.id = item.id || item[keyField] })
    
    this.indexManager = new IndexManager({ items, itemName })
  }

  add(item) {
    if (this.get(item.id) !== undefined) {
      throw new Error(`Cannot add item with existing key '${item.id}'; try 'update'.`)
    }
    
    this.indexManager.addItem(item)
  }

  /**
  * Retrieves a single item by name.
  */
  get(id, options) {
    // The IndexManager uses 'itemName' to produce verbose error messages if necessary so we can just use it directly.
    return indexManager.getItem(id, options)
  }
  
  update(item) {
    if (this.get(item.id) === undefined) {
      throw new Error(`No such item with key '${item.id}' to update; try 'add'.`)
    }
    
    return this.indexManager.updateItem(item)
  }
  
  delete(itemId) {
    const item = this.get(itemId)
    if (item === undefined) {
      throw new Error(`No such item with id '${item.id}' found.`)
    }
    
    const itemIndex = this.indexOf((i) => i.id === item.id)
    this.#items.splice(itemIndex, 1)
    
    this.indexManager.deleteItem(item)
  }

  list({ sort = 'id' } = {}) {
    return sort
      ? this.#items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
      : this.#items
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
