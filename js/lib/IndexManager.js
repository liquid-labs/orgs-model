import * as relationships from './index-relationships.js'

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
      indexSpecs: this.#indexSpecs,
      one2oneFunc: updateOneToOne,
      one2manyFunc: updateOneToMany
    })
  }
  
  deleteItem(item) {
    routeByRelationships({
      item,
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
  for (const indexSpec of indexSpecs) {
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
const updateOneToOne = (args) => { addOneToOne(args) }

/**
* Any "is this a valid update" checks are assumed to be performed by the caller.
*/
const updateOneToMany = ({ item, ...rest }) => {
  const { list, listIndex } = getListAndIndex({ item, ...rest })
  list.splice(listIndex, 1, item)
}

/**
* Any "is this a valid delete" checks are assumed to be performed by the caller.
*/
const deleteOneToOne = ({ item, index, keyField }) => {
  delete index[item[keyField]]
}

/**
* Any "is this a valid delete" checks are assumed to be performed by the caller.
*/
const deleteOneToMany = (args) => {
  const { list, listIndex } = getListAndIndex(args)
  list.splice(listIndex, 1)
}

/**
* Helper for update and delete 'one2many' functions.
*/
const getListAndIndex = ({ item, index, keyField }) => {
  console.log(index)
  const indexValue = item[keyField]
  const list = index[indexValue]
  const listIndex = list.findIndex((i) => i[keyField] === indexValue)
  return { list, listIndex }
}

export { IndexManager }
