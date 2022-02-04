import structuredClone from 'core-js-pure/actual/structured-clone'

import * as fs from 'fs'

import { ListManager } from './ListManager'
import { Item } from './Item'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  /**
  * Used to transform incoming ID into a standard format. Must be a function that takes a single argument of the raw ID
  * and returns a normalized ID. This can be used, for example, to lowercase string IDs.
  */
  #idNormalizer
  #itemCreationOptions
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
  #dataCleaner
  #resourceName

  constructor({
    fileName,
    idNormalizer = (id) => id,
    indexes = [],
    itemClass = Item,
    itemCreationOptions = {},
    itemName,
    items = [],
    keyField,
    dataCleaner,
    readFromFile = false,
    resourceName
  }) {
    this.#fileName = fileName
    this.#idNormalizer = idNormalizer
    this.#itemClass = itemClass
    this.#itemName = itemName
    this.#keyField = keyField
    this.#resourceName = resourceName
    this.#dataCleaner = dataCleaner
    if (readFromFile === true && items && items.length > 0) {
      throw new Error(`Cannot specify both 'readFromFile : true' and 'items' when loading ${resourceName}.`)
    }
    if (readFromFile === true && !fileName) {
      throw new Error(`Must specify 'fileName' when 'readFromFile : true' while loading ${resourceName}.`)
    }
    if (readFromFile === true) {
      items = JSON.parse(fs.readFileSync(fileName))
    }
    // add standard 'id' field if not present.
    items = items || []
    const seen = {}
    items.forEach((item) => {
      item.id = this.#idNormalizer(item.id || item[keyField])
      if (seen[item.id] === true) { throw new Error(`Found duplicate emails '${item.id} in the ${this.resourceName} list.`) }
      seen[item.id] = true
    })

    this.listManager = new ListManager({ items, idField : keyField, className : resourceName })
    this.#indexById = this.listManager.getIndex('byId')
    this.#itemCreationOptions = Object.assign({}, itemCreationOptions, { keyField })
    this.#addIndexes(indexes)
  }

  get keyField() { return this.#keyField }
  get itemName() { return this.#itemName }
  get resourceName() { return this.#resourceName }

  add(data) {
    data = ensureRaw(data)
    if (data.id === undefined) data.id = this.#idNormalizer(data[this.keyField])

    if (this.has(data.id)) {
      throw new Error(`Cannot add ${this.itemName} with existing key '${data.id}'; try 'update'.`)
    }

    this.listManager.addItem(data)
  }

  /**
  * Retrieves a single vendor/product entry by name.
  */
  get(name, options) {
    const data = this.#indexById[name]
    return this.#dataToItem(data, Object.assign({ id : name }, options || {}))
  }

  has(name) { return !!this.#indexById[name] }

  update(data, { skipGet = false, ...rest } = {}) {
    data = ensureRaw(data)
    const id = data[this.#keyField]
    if (!this.has(id) === undefined) {
      throw new Error(`No such ${this.#itemName} with key '${id}' to update; try 'add'.`)
    }

    this.listManager.updateItem(data)

    if (skipGet === true) return
    // else
    return this.get(id, rest)
  }

  delete(itemId, { required = false } = {}) {
    itemId = this.#idNormalizer(itemId)
    const item = this.#indexById[itemId]
    if (required === true && item === undefined) {
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
  list({ sort = 'id', ...rest } = {}) {
    // 'noClone' provides teh underlying list itself; since we sort, let's copy the arry (with 'slice()')
    const items = this.constructor.sort({
      sort,
      items : [...this.listManager.getItems({ noClone : true })]
    })
    return this.#dataToList(items, rest)
  }

  write({ fileName = this.#fileName } = {}) {
    if (!fileName) throw new Error(`Cannot write '${this.resourceName}' database no file name specified. Ideally, the file name is captured when the DB is initialized. Alternatively, it can be passed to this function as an option.`)

    let itemList = this.list({ rawData : true })
    if (this.#dataCleaner) {
      itemList = itemList.map((i) => this.#dataCleaner(i))
    }
    fs.writeFileSync(fileName, JSON.stringify(itemList, null, '  '))
  }

  #addIndexes(indexes) {
    for (const { indexField, relationship } of indexes) {
      this.listManager.addIndex({
        name     : indexField,
        keyField : indexField,
        relationship
      })

      const functionName = `getBy${indexField[0].toUpperCase() + indexField.slice(1)}`
      this[functionName] = this.#getByIndex.bind(this, indexField)
    }
  }

  #createItem(data) {
    return new this.#itemClass(data, this.#itemCreationOptions)
  }

  #dataToItem(data, { clean = false, required = false, rawData = false, id, errMsgGen, ...rest } = {}) {
    if (clean === true && rawData === false) {
      throw new Error(`Incompatible options; 'clean = true' requires 'raw data = true'`)
    }
    if (required === true && data === undefined) {
      errMsgGen = errMsgGen || (() => `Did not find required ${this.#itemName}${id ? ` '${id}'.` : ''}.`)
      throw new Error(errMsgGen())
    }

    if (data === undefined) return undefined
    if (rawData) {
      data = structuredClone(data)
      return clean === true ? this.#dataCleaner(data) : data
    }
    // else
    return this.#createItem(data)
  }

  #dataToList(data, { clean = false, rawData = false } = {}) {
    return rawData !== true
      ? data.map((data) => this.#createItem(data))
      : clean === true
        ? data.map((i) => structuredClone(this.#dataCleaner(i)))
        : structuredClone(data)
  }

  #getByIndex(indexName, key, options) {
    const result = this.listManager.getByIndex({ indexName, key, noClone : true })
    if (Array.isArray(result)) {
      return this.#dataToList(result, options)
    }
    else {
      return this.#dataToItem(result, Object.assign(options || {}, { id : key }))
    }
  }

  static sort({ sort = 'id', items }) {
    if (sort) items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid

    return items
  }
}

const ensureRaw = (data) => data instanceof Item ? data.rawData : structuredClone(data)

const commonAPIInstanceSetup = ({ self, org, checkCondition }) => {
  self.org = org
  // e.g.: { ref: "bad-audit-name", sourceName: "Acme Vendor", "sourceType": "vendor" }
  self.checkCondition = checkCondition
}

export {
  commonAPIInstanceSetup,
  Resources
}
