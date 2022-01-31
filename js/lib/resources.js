import { ListManager } from './ListManager.js'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  /**
  * Tracks whether the model has changed since the last write operation.
  */
  #changedSinceWrite
  #fileName
  /**
  * Internal 'by ID' index.
  */
  #indexById
  #itemName
  /**
  * Our 'keyField'. We will always annotate incoming objcts with 'id', but the resource may use another field for it's
  * canonical ID.
  */
  #keyField
  /**
  * Tracks whether the modl has been validated since the last change.
  */
  #requiresValidation
  #resourceName

  constructor({ fileName, itemName, items = [], keyField, resourceName  }) {
    this.#fileName = fileName
    this.#keyField = keyField
    this.#itemName = itemName
    this.#resourceName = resourceName
    this.items = items || []
    // add standard 'id' field if not present.
    this.items.forEach((item) => { item.id = item.id || item[keyField] })

    this.listManager = new ListManager({ items })
    this.#indexById = this.listManager.getIndex('byId')
    
    this.#changedSinceWrite = false
    this.#requiresValidation = true
  }

  get keyField() { return this.#keyField }
  get itemName() { return this.#itemName }
  get resourceName() { return this.#resourceName }

  add(item) {
    if (item.id === undefined) {
      if (item[this.keyField] === undefined) {
        throw new Error(`Cannot add item '${item}' with no 'id' or ${this.keyField}`)
      }
      item.id = item[this.keyField]
    }

    if (this.get(item.id) !== undefined) {
      throw new Error(`Cannot add item with existing key '${item.id}'; try 'update'.`)
    }

    this.listManager.addItem(item)
    this.#changed()
  }

  /**
  * Retrieves a single vendor/product entry by name.
  */
  get(name, { required = false } = {}) {
    const result = this.#indexById[name]
    if (required === true && result === undefined) {
      throw new Error(`Did not find required vendor '${name}'.`)
    }

    return result === undefined
      ? undefined
      : Object.assign({}, result)
  }

  update(item) {
    if (this.get(item.id) === undefined) {
      throw new Error(`No such ${this.#itemName} with key '${item.id}' to update; try 'add'.`)
    }

    this.listManager.updateItem(item)
    this.#changed()
    
    return item
  }

  delete(itemId) {
    const item = this.get(itemId)
    if (item === undefined) {
      throw new Error(`No such item with id '${item.id}' found.`)
    }

    this.listManager.deleteItem(item)
    this.#changed()
  }

  list({ sort = 'id', _items = this.items } = {}) {
    return sort
      ? _items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
      : _items
  }
  
  write({ fileName = this.#fileName }) {
    if (!fileName) throw new Error(`Cannot write '${this.resourceName}' database no file name specified. Ideally, the file name is captured when the DB is initialized. Alternatively, it can be passed to this function as an option.`)
    
    fs.writeFileSync(fileName, JSON.stringify(this.items, null, '  '))
    if (fileName === this.#fileName) {
      this.#changedSinceWrite = false
    }
  }
  
  #changed() {
    this.#requiresValidation = true
    this.#changedSinceWrite = true
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
