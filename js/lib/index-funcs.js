import * as relationship from './index-relationships.js'

const rebuild = (args) => {
  routeByRelationship({
    ...args,
    one2oneFunc: rebuildOneToOne,
    one2manyFunc: rebuildOneToMany
  })
}

const rebuildAll = (args) => {
  routeByRelationships({
    ...args,
    one2oneFunc: rebuildOneToOne,
    one2manyFunc: rebuildOneToMany
  })
}

const addItem = (args) => {
  routeByRelationships({
    ...args,
    one2oneFunc: addOneToOne,
    one2manyFunc: addOneToMany
  })
}

const updateItem = (args) => {
  routeByRelationships({
    ...args,
    one2oneFunc: updateOneToOne,
    one2manyFunc: updateOneToMany
  })
}

const deleteItem = (args) => {
  routeByRelationships({
    ...args,
    one2oneFunc: deleteOneToOne,
    one2manyFunc: deleteOneToMany
  })
}

/**
* ## Helpers
* ### Internal plumbing
*/

const routeByRelationship = ({ items, indexSpec, one2oneFunc, one2manyFunc }) => {
  switch (indexSpec.relationship) {
    case relationship.ONE_TO_ONE: one2oneFunc({ items, ...indexSpec }); break
    case relationship.ONE_TO_MANY: one2manyFunc({ items, ...indexSpec }); break
    default: throw new Error(`Unknown index relationship spec ('${relationship}')`)
  }
}

const routeByRelationships = ({ indexSpecs, ...rest }) => {
  for (const indexSpec of indexSpecs) {
    routeByRelationship({ indexSpec, ...rest })
  }
}

const truncateObject = (o) => {
  for (const key in o) {
    delete o[key]
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
const updateOne2One = addOneToOne

/**
* Any "is this a valid update" checks are assumed to be performed by the caller.
*/
const updateOneToMany = ({ item, ...rest }) => {
  const { list, listIndex } = getListIndex({ item, ...rest })
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
  const { list, listIndex } = getListIndex(args)
  list.splice(listIndex, 1)
}

/**
* Helper for update and delete functions 'one2many' functions.
*/
const getListAndIndex = ({ item, index, keyField }) => {
  const indexValue = item[keyField]
  const list = index[indexValue]
  const listIndex = list.findIndex((i) => i[keyField] === indexValue)
  return { list, listIndex }
}

export {
  rebuild,
  rebuildAll,
  addItem,
  updateItem,
  deleteItem
}
