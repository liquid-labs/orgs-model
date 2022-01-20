import * as relationships from './index-relationships.js'

/**
* Manages simple value-field one-to-one and one-to-many indexes. An implicit 'byId' index, which can be retrieved via
* `indexManager.getIndex('byId')` (or whatever you configure as the `idIndexName`) is implicitly created and cannot be
* deleted.
*
* ## Usage requirements
*
* - The ID field _*must*_ be effectively immutable.
* - Items returned to the user _*must*_ be copied.
*
* ## Implementation notes
*
* The implicity 'byId' index is necessary to manage item updates where it is necessary to identify the previous item
* in order to properly update the non-ID indexes.
*/
const IndexManager = class {
  #indexSpecs = []
  #specIndex = {}
  #items
  #idIndex
  
  constructor({ items, idField = 'id', idIndexName = 'byId' }) {
    this.#items = items
    this.#idIndex = this.addIndex({
      name: 'byId',
      keyField: idField,
      relationship: relationships.ONE_TO_ONE
    })
  }
  
  addIndex(indexSpec) {
    for (const reqField of ['relationship', 'keyField']) {
      if (indexSpec[reqField] === undefined) {
        throw new Error(`Index spec lacks required field '${reqField}'.`)
      }
    }

    const index = {}
    indexSpec = { index, ...indexSpec }
    this.#indexSpecs.push(indexSpec)
    if (indexSpec.name !== undefined) {
      this.#specIndex[indexSpec.name] = indexSpec
    }
    this.rebuild(indexSpec)
    
    return index
  }
  
  getIndex(name) {
    return this.#getIndexSpec(name).index
  }
  
  getNamedIndexCount() { return Object.keys(this.#specIndex).length }
  
  getTotalIndexCount() { return this.#indexSpecs.length }
  
  rebuild(specOrName) {
    const indexSpec = typeof specOrName === 'string' ? this.#getIndexSpec(specOrName) : specOrName
    routeByRelationship({
      items: this.#items,
      indexSpec,
      one2oneFunc: rebuildOneToOne,
      one2manyFunc: rebuildOneToMany
    })
  }
  
  rebuildAll() {
    routeByRelationships({
      items: this.#items,
      indexSpecs: this.#indexSpecs,
      one2oneFunc: rebuildOneToOne,
      one2manyFunc: rebuildOneToMany
    })
  }
  
  addItem(item) {
    routeByRelationships({
      item,
      indexSpecs: this.#indexSpecs,
      one2oneFunc: addOneToOne,
      one2manyFunc: addOneToMany
    })
  }
  
  updateItem(item) {
    routeByRelationships({
      item,
      idKey: this.#getIdIndexKey(),
      idIndex: this.#idIndex,
      indexSpecs: this.#indexSpecs,
      one2oneFunc: updateOneToOne,
      one2manyFunc: updateOneToMany
    })
  }
  
  deleteItem(item) {
    routeByRelationships({
      item,
      idKey: this.#getIdIndexKey(),
      idIndex: this.#idIndex,
      indexSpecs: this.#indexSpecs,
      one2oneFunc: deleteOneToOne,
      one2manyFunc: deleteOneToMany
    })
  }
  
  #getIndexSpec(name) {
    const indexSpec = this.#specIndex[name]
    if (indexSpec === undefined) {
      throw new Error(`No such index '${name}' found.`)
    }
    return indexSpec
  }
  
  #getIdIndexKey() {
    return this.#indexSpecs[0].keyField // the 'ID index' is always first
  }
}

/**
* ## Helpers
* ### Internal plumbing
*/
const truncateObject = (o) => {
  for (const key in o) {
    delete o[key]
  }
}

const routeByRelationship = ({ indexSpec, one2oneFunc, one2manyFunc, ...rest }) => {
  switch (indexSpec.relationship) {
    case relationships.ONE_TO_ONE: one2oneFunc({ ...indexSpec, ...rest }); break
    case relationships.ONE_TO_MANY: one2manyFunc({ ...indexSpec, ...rest }); break
    // TODO: include this check in 'addIndex'
    default: throw new Error(`Unknown index relationship spec ('${indexSpec.relationship}')`)
  }
}

const routeByRelationships = ({ indexSpecs, ...args }) => {
  // the reversal is necessary to preserve the original item stored in the implicit, first ID index
  for (const indexSpec of indexSpecs.reverse()) {
    routeByRelationship({ indexSpec, ...args })
  }
}

// ### Rebuild helpers
const rebuildOneToOne = ({ items, index, keyField }) => {
  truncateObject(index)
  items.reduce((newIdx, item) => { newIdx[item[keyField]] = item; return newIdx }, index)
}
  
const rebuildOneToMany = ({ items, index, keyField }) => {
  truncateObject(index)
  items.reduce((newIdx, item) => {
    const indexValue = item[keyField]
    const list = newIdx[indexValue] || []
    list.push(item)
    newIdx[indexValue] = list
    return newIdx
  }, index )
}

/**
* Any "is this a valid add" checks are assumed to be performed by the caller.
*/
const addOneToOne = ({ item, index, keyField }) => {
  index[item[keyField]] = item
}

/**
* Any "is this a valid add" checks are assumed to be performed by the caller.
*/
const addOneToMany = ({ item, index, keyField }) => {
  const indexValue = item[keyField]
  const list = index[indexValue] || []
  list.push(item)
  index[indexValue] = list
}

/**
* Any "is this a valid update" checks are assumed to be performed by the caller.
*/
const updateOneToOne = ({ item, index, keyField, idKey, idIndex }) => {
  if (idIndex !== index) {
    // then we have to remove the original entry before adding the new entry
    const origItem = idIndex[item[idKey]]
    delete index[origItem[keyField]]
  }
  index[item[keyField]] = item
}

/**
* Any "is this a valid update" checks are assumed to be performed by the caller.
*/
const updateOneToMany = ({ item, keyField, index, idKey, idIndex }) => {
  const { origItem, origList, origListIndex } = getOrigData({ item, idKey, idIndex, keyField, index })
  if (origItem[keyField] === item[keyField]) {
    // then the key value of this index hasn't changed and we can simply replace
    origList.splice(origListIndex, 1, item)
  }
  else { // the key value has changed and we need to delete the original and re-add the new value
    origList.splice(origListIndex, 1)
    addOneToMany({ item, keyField, index })
  }
}

/**
* Any "is this a valid delete" checks are assumed to be performed by the caller. Currently, deletion just looks at the
* ID field and will happily delete an item from the index even if it is changed. Future versions will suport a
* `requireClean` parameter.
*/
const deleteOneToOne = ({ item, keyField, index, idKey, idIndex }) => {
  const origItem = idIndex[item[idKey]]
  // the current item may have had the index value changed, so we delete based on the origItem
  delete index[origItem[keyField]]
}

/**
* Any "is this a valid delete" checks are assumed to be performed by the caller. Currently, deletion just looks at the
* ID field and will happily delete an item from the index even if it is changed. Future versions will suport a
* `requireClean` parameter.
*/
const deleteOneToMany = ({ item, keyField, index, idKey, idIndex }) => {
  const { origItem, origList, origListIndex } = getOrigData({ item, idKey, idIndex, keyField, index })
  origList.splice(origListIndex, 1)
}

/**
* Helper for update and delete 'one2many' functions.
*/
const getOrigData = ({ item, idKey, idIndex, keyField, index }) => {
  const origItem = idIndex[item[idKey]]
  const origIndexValue = origItem[keyField]
  const origList = index[origIndexValue]
  // We compare keys rather than objects as returned objects must be copied to preserve the integrity of the original
  // items along with the indexes.
  const origListIndex = origList.findIndex((i) => i[idKey] === origItem[idKey])
  
  return { origItem, origList, origListIndex }
}

export { IndexManager }
