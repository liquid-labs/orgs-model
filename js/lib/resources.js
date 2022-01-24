import { ListManager } from './ListManager.js'
import * as relationships from './index-relationships.js'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  #indexById
  
  constructor({ items = [], keyField }) {
    this.items = items || []
    // add standard 'id' field if not present.
    this.items.forEach((item) => { item.id = item.id || item[keyField] })
    
    this.listManager = new ListManager({ items })
    this.#indexById = this.listManager.getIndex('byId')
  }

  add(item) {
    if (this.get(item.id) !== undefined) {
      throw new Error(`Cannot add item with existing key '${item.id}'; try 'update'.`)
    }

    this.items.push(item)
    
    this.listManager.addItem(item)
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
    if (this.get(item.id) === undefined) {
      throw new Error(`No such item with key '${item.id}' to update; try 'add'.`)
    }
    
    const itemIndex = this.indexOf(item)
    this.items.splice(itemIndex, 1, item)
    
    this.listManager.updateItem(item)
    
    return item
  }
  
  delete(itemId) {
    const item = this.get(itemId)
    if (item === undefined) {
      throw new Error(`No such item with id '${item.id}' found.`)
    }
    
    const itemIndex = this.indexOf((i) => i.id === item.id)
    this.items.splice(itemIndex, 1)
    
    this.listManager.deleteItem(item)
  }

  list({ sort = 'id', _items = this.items } = {}) {
    return sort
      ? _items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
      : _items
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
