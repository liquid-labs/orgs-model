import * as fs from 'fs'

import { ListManager } from './ListManager'
import { Item } from './Item'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  #fileName
  /**
  * Internal 'by ID' index.
  */
  #indexById
  #itemClass
  #itemName
  /**
  * Our 'keyField'. We will always annotate incoming objcts with 'id', but the resource may use another field for it's
  * canonical ID.
  */
  #keyField
  #resourceName

  constructor({ fileName, itemClass = Item, itemName, items = [], keyField, readFromFile = false, resourceName }) {
    this.#fileName = fileName
    this.#keyField = keyField
    this.#itemClass = itemClass
    this.#itemName = itemName
    this.#resourceName = resourceName
    if (readFromFile === true && items && items.length > 0) {
      throw new Error(`Cannot specify both 'readFromFile : true' and 'items' when loading ${resourceName}.`)
    }
    if (readFromFile === true && !fileName) {
      throw new Error(`Must specify 'fileName' when 'readFromFile : true' while loading ${resourceName}.`)
    }
    if (readFromFile === true) {
      this.items = JSON.parse(fs.readFileSync(fileName))
    }
    else {
      this.items = items || []
    }
    // add standard 'id' field if not present.
    this.items.forEach((item) => { item.id = item.id || item[keyField] })

    this.listManager = new ListManager({ items })
    this.#indexById = this.listManager.getIndex('byId')
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

    return item
  }

  delete(itemId) {
    const item = this.get(itemId)
    if (item === undefined) {
      throw new Error(`No such item with id '${item.id}' found.`)
    }

    this.listManager.deleteItem(item)
  }

  /**
  * Returns a list of the resource items.
  *
  * ### Parameters
  *
  * - `sort`: the field to sort on. Defaults to 'id'. Set to falsy unsorted and slightly faster results.
  */
  list({ sort = 'id' } = {}) {
    // 'noClone' provides teh underlying list itself; since we sort, let's copy the arry (with 'slice()')
    return this.constructor.sort({ sort, items: this.listManager.getItems({ noClone : true }).slice() })
      .map((i) => new this.#itemClass(i))
  }

  write({ fileName = this.#fileName }) {
    if (!fileName) throw new Error(`Cannot write '${this.resourceName}' database no file name specified. Ideally, the file name is captured when the DB is initialized. Alternatively, it can be passed to this function as an option.`)

    fs.writeFileSync(fileName, JSON.stringify(this.items, null, '  '))
  }
  
  static sort({ sort = 'id', items }) {
    if (sort) items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
    
    return items
  }
}

const commonAPIInstanceSetup = ({ self, org, checkCondition }) => {
  self.org = org
  // e.g.: { ref: "bad-audit-name", sourceName: "Acme Vendor", "sourceType": "vendor" }
  self.checkCondition = checkCondition
}

export {
  commonAPIInstanceSetup,
  Resources
}
