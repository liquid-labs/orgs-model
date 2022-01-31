// TODO: update tests to distinguish between implicit ID index and user added one-to-one indexes. See deletion tests for updated wording.

/* globals beforeAll describe expect test */
import { ListManager } from '../ListManager.js'
import * as idxRelationships from '../index-relationships.js'

const testItems = [
  { id: 1, type: 'foo', nestedObj: { data: "Hi!" } },
  { id: 2, type: 'bar' },
  { id: 3, type: 'foo' }
]

const oneToOneSpec = { name: 'byId2', relationship: idxRelationships.ONE_TO_ONE, keyField: 'id' }
const oneToManySpec = { name: 'byType', relationship: idxRelationships.ONE_TO_MANY, keyField: 'type' }

const verifyOneToOneIndex = ({ index, items = testItems }) => {
  expect(Object.keys(index)).toHaveLength(items.length)
  for (const item of items) {
    expect(index[item.id]).toBe(item)
  }
}

const verifyOneToManyIndex = ({ index, items = testItems, expectedSize = 2, listSizes = { foo: 2, bar: 1 } }) => {
  expect(Object.keys(index)).toHaveLength(expectedSize)
  for (const key in index) {
    expect(index[key]).toHaveLength(listSizes[key])
  }
  for (const item of items) {
    expect(index[item.type].includes(item)).toBe(true)
  }
}

describe('ListManager', () => {
  describe('contructor', () => {
    const items = [...testItems]
    const listManager = new ListManager({ items })
    const newId = items.length + 1
    const newItem = { id: newId, type: "new" }
    const newListIdx = items.length
    
    beforeAll(() => {
      items.push(newItem)
      listManager.rebuildAll()
    })
    
    test('uses the list object itself', () => {
      expect(listManager.getItem(newId)).toEqual(newItem)
    })
    
    test('uses the items in the list', () => {
      // notice that we're twiddling the item we added to avoid polluting the original items
      items[newListIdx].testField = 10
      const retrievedItem = listManager.getItem(newId)
      expect(retrievedItem.testField).toBe(10)
    })
  })
  
  describe('getItems', () => {
    const items = [...testItems]
    const listManager = new ListManager({ items })
    const defaultItems = listManager.getItems()
    const clonedItems = listManager.getItems({ cloneAll: true })
    
    test('returns a copy of the list containing the original items by default', () => {
      delete defaultItems.getSafe
      expect(items).toEqual(defaultItems)
      expect(items).not.toBe(defaultItems)
      expect(items[0]).toBe(defaultItems[0])
    })
    
    test("'cloneAll : true' results in unique list and items", () => {
      expect(items).toEqual(clonedItems)
      expect(items).not.toBe(clonedItems)
      expect(items[0]).toEqual(clonedItems[0])
      expect(items[0]).not.toBe(clonedItems[0])
    })
  })
  
  describe('getItem', () => {
    const items = [...testItems]
    const listManager = new ListManager({ items })
    const itemGet = listManager.getItem(1)
    const itemOrig = items[0]
    
    test('creates an independent copy of the managed object', () => {
      expect(itemGet).toEqual(itemOrig)
      expect(itemGet).not.toBe(itemOrig)
    })
    
    test('performs a deep copy', () => {
      expect(itemGet.nestedObj).toEqual(itemOrig.nestedObj)
      expect(itemGet.nestedObj).not.toBe(itemOrig.nestedObj)
    })
  })
  
  describe('getByIndex', () => {
    const items = [...testItems]
    const listManager = new ListManager({ items })
    const indexMap = {} // we can't use 'byId', etc. directly in our 'each' arrays because they get eval before before
    
    beforeAll(() => {
      const byId = listManager.getIndex('byId')
      indexMap['byId'] = byId
      const oneToOne = listManager.addIndex(oneToOneSpec)
      indexMap[oneToOneSpec.name] = oneToOne
      const anonymousSpec = Object.assign({}, oneToManySpec)
      delete anonymousSpec.name
      const anonymousOneToMany = listManager.addIndex(anonymousSpec)
      indexMap['anon'] = anonymousOneToMany
    })
    
    test.each(['byId', oneToOneSpec.name])
      ("can reference '%s' index by name, getting a copy", (indexName) => {
      const result = listManager.getByIndex({ indexName, key: 1 })
      expect(result).toEqual(items[0])
      expect(result).not.toBe(items[0])
    })
    
    test.each(['byId', oneToOneSpec.name])
      ("can use '%s' index ref, getting a copy", (indexName) => {
      const index = indexMap[indexName]
      const result = listManager.getByIndex({ index, key: 1 })
      expect(result).toEqual(items[0])
      expect(result).not.toBe(items[0])
    })
  })
  
  describe('addIndex', () => {
    const items = [...testItems]
    const listManager = new ListManager({ items })
    let oneToOne, oneToMany, anonymous
    
    beforeAll(() => {
      oneToOne = listManager.getIndex('byId')
      oneToMany = listManager.addIndex(oneToManySpec)
      const anonymousSpec = Object.assign({}, oneToManySpec)
      delete anonymousSpec.name
      anonymous = listManager.addIndex(anonymousSpec)
    })
    
    test('properly initalizes implicit one-to-on index', () => verifyOneToOneIndex({ index: oneToOne }))
    
    test('properly initializes one-to-many index', () => verifyOneToManyIndex({ index: oneToMany }))
    
    test('properly initalizes anonymous indexes', () => verifyOneToManyIndex({ index: anonymous }))
  })
  
  describe('indexCounts', () => {
    const listManager = new ListManager({ items: [...testItems] })
    
    beforeAll(() => {
      const anonymousSpec = Object.assign({}, oneToManySpec)
      delete anonymousSpec.name
      listManager.addIndex(anonymousSpec)
    })
    
    test('has 1 named index', () => expect(listManager.getNamedIndexCount()).toBe(1))
    
    test('has 2 indexes total', () => expect(listManager.getTotalIndexCount()).toBe(2))
  })
  
  describe('rebuild', () => {
    describe('for one-to-one indexes', () => {
      const items = [...testItems]
      const listManager = new ListManager({ items })
      let index
      
      beforeAll(() => {
        index = listManager.getIndex('byId')
        items.splice(2, 1) // remove id: 3
        items.push({ id: 8, type: 'new' })
        listManager.rebuild({ keyField: 'id', relationship: idxRelationships.ONE_TO_ONE, index })
      })
      
      test('builds a valid one-to-one index', () => verifyOneToOneIndex({ index, items }))
      
      test('removes old entries', () => expect(index[3]).toBeUndefined())
    }) // end rebuild/one-to-one
    
    describe('for one-to-many indexes', () => {
      const items = [...testItems, { id: 8, type: 'old'} ]
      const listManager = new ListManager({ items })
      let index

      beforeAll(() => {
        index = listManager.addIndex(oneToManySpec)
        items.splice(items.length - 1, 1) // id: 8
        listManager.rebuild('byType')
      })
      
      test('creates a valid one-to-many index', () => verifyOneToManyIndex({ index }))
      
      test('removes old entries', () => expect(index['old']).toBeUndefined())
    }) // end rebuild/one-to-many
  }) // end rebuild
  
  describe('rebuildAll', () => {
    const items = [...testItems, { id: 8, type: 'old' }]
    const listManager = new ListManager({ items })
    let oneToOne, oneToMany
    
    beforeAll(() => {
      oneToOne = listManager.getIndex('byId')
      oneToMany = listManager.addIndex(oneToManySpec)
      items.splice(items.length - 1, 1)
      listManager.rebuildAll()
    })
    
    test('properly rebuilds multiple indexes', () => {
      verifyOneToOneIndex({ index: oneToOne })
      verifyOneToManyIndex({ index: oneToMany })
    })
    
    test('removes old entries', () => {
      expect(oneToOne[8]).toBeUndefined()
      expect(oneToMany['old']).toBeUndefined()
    })
  })
  
  describe('addItem', () => {
    let oneToOne, oneToMany
    const items = [...testItems]
    const item7 = { id: 7, type: 'foo' }
    const item8 = { id: 8, type: 'new' }
    const listManager = new ListManager({ items })
    
    beforeAll(() => {
      oneToOne = listManager.getIndex('byId')
      oneToMany = listManager.addIndex(oneToManySpec)
      
      listManager.addItem(item7)
      listManager.addItem(item8)
    })
    
    test('properly updates one-to-one indexes', () => {
      verifyOneToOneIndex({ index: oneToOne, items: listManager.getItems({ noClone: true }) })
      expect(oneToOne[7]).toBe(item7)
    })
    
    test('properly updates one-to-many indexes', () => {
      verifyOneToManyIndex({
        index: oneToMany,
        items: listManager.getItems({ noClone: true }),
        expectedSize: 3,
        listSizes : { foo: 3, bar: 1, new: 1 }
      })
      expect(oneToMany['new'][0]).toBe(item8)
    })
  })
  
  describe('updateItem', () => {
    let oneToOne, oneToMany
    const items = [...testItems]
    const newItem = { id: 3, type: 'new' }
    
    beforeAll(() => {
      const listManager = new ListManager({ items })
      oneToOne = listManager.getIndex('byId')
      oneToMany = listManager.addIndex(oneToManySpec)
      
      listManager.updateItem(newItem)
    })
    
    test('properly updates one-to-one indexes', () => {
      verifyOneToOneIndex({ index: oneToOne, items })
      expect(oneToOne[3]).toBe(newItem)
    })
    
    test('properly updates one-to-many indexes', () => {
      verifyOneToManyIndex({ index: oneToMany, items, expectedSize: 3, listSizes : { foo: 1, bar: 1, new: 1 } })
      expect(oneToMany['new'][0]).toBe(newItem)
    })
  })
  
  describe('deleteItem', () => {
    let oneToOne, oneToMany, itemToDelete
    const items = [...testItems]
    
    beforeAll(() => {
      const listManager = new ListManager({ items })
      oneToOne = listManager.getIndex('byId')
      oneToMany = listManager.addIndex(oneToManySpec)
      
      itemToDelete = items[2]
      listManager.deleteItem(itemToDelete)
    })
    
    test('properly deletes from ID index', () => {
      verifyOneToOneIndex({ index: oneToOne, items })
      expect(oneToOne[3]).toBeUndefined()
    })
    
    test('properly deletes from one-to-many index', () => {
      verifyOneToManyIndex({ index: oneToMany, items, expectedSize: 2, listSizes : { foo: 1, bar: 1 } })
      expect(oneToMany['foo'][0]).not.toBe(itemToDelete)
    })
  })
})