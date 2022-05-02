import structuredClone from 'core-js-pure/actual/structured-clone'
import * as fs from 'fs'

import { getSourceFile } from '@liquid-labs/federated-json'

import { ListManager } from './ListManager'
import { Item } from './Item'

/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  #itemCreationOptions
  #fileName
  /**
  * Internal 'by ID' index.
  */
  #indexById

  constructor({
    fileName,
    indexes = [],
    additionalItemCreationOptions = {},
    // TODO: if itemName not specified, deduce from 'itemClass'
    items = [],
    readFromFile = false
  }) {
    this.#fileName = fileName || getSourceFile(items)

    if (readFromFile === true && items && items.length > 0) {
      throw new Error(`Cannot specify both 'readFromFile : true' and 'items' when loading ${this.resourceName}.`)
    }
    if (readFromFile === true && !fileName) {
      throw new Error(`Must specify 'fileName' when 'readFromFile : true' while loading ${this.resourceName}.`)
    }
    if (readFromFile === true) {
      items = JSON.parse(fs.readFileSync(fileName))
    }
    // add standard 'id' field if not present.
    items = items || []
    const seen = {}
    items.forEach((item) => {
      item.id = item.id || this.idNormalizer(item[this.keyField])
      if (seen[item.id] === true) {
        throw new Error(`Found items with duplicate key field '${this.keyField}' values ('${item.id}') in the ${this.resourceName} list.`)
      }
      seen[item.id] = true
    })

    this.listManager = new ListManager({
      className    : this.resourceName,
      keyField     : this.keyField,
      idNormalizer : this.idNormalizer,
      items
    })
    this.#indexById = this.listManager.getIndex('byId')
    this.#itemCreationOptions = Object.assign({},
      additionalItemCreationOptions
    )
    this.#addIndexes(indexes)
  }

  // item config convenience accessors
  get dataCleaner() { return this.constructor.itemConfig.dataCleaner }

  get dataFlattener() { return this.constructor.itemConfig.dataFlattener }

  /**
  * See [Item.idNormalizer](./Item.md#idnormalizer)
  */
  get idNormalizer() { return this.constructor.itemConfig.idNormalizer }

  get itemClass() { return this.constructor.itemConfig.itemClass }

  get itemName() { return this.constructor.itemConfig.itemName }

  /**
  * See [Item.keyField](./Item.md#keyfield)
  */
  get keyField() { return this.constructor.itemConfig.keyField }

  get resourceName() { return this.constructor.itemConfig.resourceName }

  add(data) {
    data = ensureRaw(data)
    if (data.id === undefined) data.id = this.idNormalizer(data[this.keyField])

    if (this.has(data.id)) {
      throw new Error(`Cannot add ${this.itemName} with existing key '${data.id}'; try 'update'.`)
    }

    this.listManager.addItem(data)
  }
  
  /**
  * Retrieves a single vendor/product entry by name.
  *
  * Options:
  * - `dataAugmentor`: used to augment the base data, such as with implied or context driven data that isn't reflected
  *   in the raw data structure. This is intendend for use by concrete resource handlers and should not be used by end
  *   users.
  */
  get(id, { dataAugmentor, ...options }) {
    let data
    if (dataAugmentor === undefined) {
      data = this.#indexById[id]
    }
    else {
      data = structuredClone(this.#indexById[id])
      dataAugmentor(data)
    }
    // TODO: if data augmented, then we could signal to skip the structuredClone that happens here
    return this.#dataToItem(data, Object.assign({}, options || {}, { id }))
  }

  has(name) { return !!this.#indexById[name] }

  update(data, { skipGet = false, ...rest } = {}) {
    data = ensureRaw(data)
    const id = data[this.keyField]
    if (!this.has(id) === undefined) {
      throw new Error(`No such ${this.itemName} with key '${id}' to update; try 'add'.`)
    }

    this.listManager.updateItem(data)

    if (skipGet === true) return
    // else
    return this.get(id, rest)
  }

  delete(itemId, { required = false } = {}) {
    itemId = this.idNormalizer(itemId)
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
  * - `dataAugmentor`: used to augment the base data, such as with implied or context driven data that isn't reflected
  *   in the raw data structure. This is intendend for use by concrete resource handlers and should not be used by end
  *   users.
  * - `sort`: the field to sort on. Defaults to 'id'. Set to `false` for unsorted and slightly faster results.
  * - `sortFunc`: a specialized sort function. If provided, then `sort` will be ignored, even if `false`.
  */
  list({ dataAugmentor, sort=this.keyField, sortFunc, ...rest } = {}) {
    let items
    if (dataAugmentor === undefined) {
      // then we can optimize by using the raw data, which is cloned later it 'dataToList'
      // 'noClone' provides the underlying list itself; since we (usually) sort, we copy through unrolling
      items = [...this.listManager.getItems({ noClone : true })]
    }
    else { // then we want the raw data, but need it to be cloned because it's going to be manipulated
      items = this.listManager.getItems({ rawData : true })
      for (const item of items) {
        dataAugmentor(item)
      }
    }

    if (sortFunc !== undefined) {
      items.sort(sortFunc)
    }
    else if (sort !== false){
      items.sort(fieldSort(sort))
    }

    // TODO: if data is augmented, we can skip the structuredClone that happens in #dataToList because it's already copied.
    return this.#dataToList(items, rest)
  }

  write({ fileName = this.#fileName } = {}) {
    if (!fileName) { throw new Error(`Cannot write '${this.resourceName}' database no file name specified. Ideally, the file name is captured when the DB is initialized. Alternatively, it can be passed to this function as an option.`) }

    let itemList = this.list({ rawData : true }) // now we have a deep copy, so we don't have to worry about changes
    if (this.dataCleaner) {
      itemList = itemList.map((i) => this.dataCleaner(i))
    }
    fs.writeFileSync(fileName, JSON.stringify(itemList, null, '  '))
  }

  #addIndexes(indexes) {
    for (const { indexField, relationship } of indexes) {
      this.listManager.addIndex({
        name : indexField,
        indexField,
        relationship
      })

      const functionName = `getBy${indexField[0].toUpperCase() + indexField.slice(1)}`
      this[functionName] = this.#getByIndex.bind(this, indexField)
    }
  }

  /**
  * A 'safe' creation method that guarantees the creation options defined in the resource constructor will override the
  * the incoming options.
  */
  createItem(data) {
    return new this.itemClass(data, this.#itemCreationOptions) // eslint-disable-line new-cap
  }

  #dataToItem(data, { clean = false, required = false, rawData = false, id, errMsgGen, ...rest } = {}) {
    if (clean === true && rawData === false) {
      throw new Error('Incompatible options; \'clean = true\' requires \'raw data = true\'')
    }
    if (required === true && data === undefined) {
      errMsgGen = errMsgGen || (() => `Did not find required ${this.itemName}${id ? ` '${id}'.` : ''}.`)
      throw new Error(errMsgGen(data[this.keyField]))
    }

    if (data === undefined) return undefined
    if (rawData === true) {
      data = structuredClone(data)
      // TODO: is this necessary? Or can we rely on prior behavior to have guaranteed ID by this point?
      data.id = data[this.keyField]
      return clean === true ? this.dataCleaner(data) : data
    }
    // else
    return this.createItem(data)
  }

  #dataToList(data, { clean = false, rawData = false } = {}) {
    return rawData !== true
      ? data.map((data) => this.createItem(data))
      : clean === true && this.dataCleaner
        ? data.map((i) => this.dataCleaner(structuredClone(i)))
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
}

const fieldSort = (field) => (a, b) => a[field].localeCompare(b[field])

const ensureRaw = (data) => data instanceof Item ? data.rawData : structuredClone(data)

export { Resources }
