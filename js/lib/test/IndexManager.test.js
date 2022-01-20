/* globals beforeAll describe expect test */
import { IndexManager } from '../IndexManager.js'
import * as idxRelationships from '../index-relationships.js'

const testItems = [
  { id: 1, type: 'foo' },
  { id: 2, type: 'bar' },
  { id: 3, type: 'foo' }
]

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

describe('IndexManager', () => {
  describe('addIndex', () => {
    const items = [...testItems]
    const indexManager = new IndexManager({ items })
    let oneToOne, oneToMany, anonymous
    
    beforeAll(() => {
      oneToOne = indexManager.getIndex('byId')
      oneToMany = indexManager.addIndex(oneToManySpec)
      const anonymousSpec = Object.assign({}, oneToManySpec)
      delete anonymousSpec.name
      anonymous = indexManager.addIndex(anonymousSpec)
    })
    
    test('properly initalizes implicit one-to-on index', () => verifyOneToOneIndex({ index: oneToOne }))
    
    test('properly initializes one-to-many index', () => verifyOneToManyIndex({ index: oneToMany }))
    
    test('properly initalizes anonymous indexes', () => verifyOneToManyIndex({ index: anonymous }))
  })
  
  describe('indexCounts', () => {
    const indexManager = new IndexManager({ items: [...testItems] })
    
    beforeAll(() => {
      const anonymousSpec = Object.assign({}, oneToManySpec)
      delete anonymousSpec.name
      indexManager.addIndex(anonymousSpec)
    })
    
    test('has 1 named index', () => expect(indexManager.getNamedIndexCount()).toBe(1))
    
    test('has 2 indexes total', () => expect(indexManager.getTotalIndexCount()).toBe(2))
  })
  
  describe('rebuild', () => {
    describe('for one-to-one indexes', () => {
      const items = [...testItems]
      const indexManager = new IndexManager({ items })
      let index
      
      beforeAll(() => {
        index = indexManager.getIndex('byId')
        items.splice(2, 1) // remove id: 3
        items.push({ id: 8, type: 'new' })
        indexManager.rebuild({ keyField: 'id', relationship: idxRelationships.ONE_TO_ONE, index })
      })
      
      test('builds a valid one-to-one index', () => verifyOneToOneIndex({ index, items }))
      
      test('removes old entries', () => expect(index[3]).toBeUndefined())
    }) // end rebuild/one-to-one
    
    describe('for one-to-many indexes', () => {
      const items = [...testItems, { id: 8, type: 'old'} ]
      const indexManager = new IndexManager({ items })
      let index

      beforeAll(() => {
        index = indexManager.addIndex(oneToManySpec)
        items.splice(items.length - 1, 1) // id: 8
        indexManager.rebuild('byType')
      })
      
      test('creates a valid one-to-many index', () => verifyOneToManyIndex({ index }))
      
      test('removes old entries', () => expect(index['old']).toBeUndefined())
    }) // end rebuild/one-to-many
  }) // end rebuild
  
  describe('rebuildAll', () => {
    const items = [...testItems, { id: 8, type: 'old' }]
    const indexManager = new IndexManager({ items })
    let oneToOne, oneToMany
    
    beforeAll(() => {
      oneToOne = indexManager.getIndex('byId')
      oneToMany = indexManager.addIndex(oneToManySpec)
      items.splice(items.length - 1, 1)
      indexManager.rebuildAll()
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
    
    beforeAll(() => {
      const indexManager = new IndexManager({ items })
      oneToOne = indexManager.getIndex('byId')
      oneToMany = indexManager.addIndex(oneToManySpec)
      
      items.push(item7)
      indexManager.addItem(item7)
      items.push(item8)
      indexManager.addItem(item8)
    })
    
    test('properly updates one-to-one indexes', () => {
      verifyOneToOneIndex({ index: oneToOne, items })
      expect(oneToOne[7]).toBe(item7)
    })
    
    test('properly updates one-to-many indexes', () => {
      verifyOneToManyIndex({ index: oneToMany, items, expectedSize: 3, listSizes : { foo: 3, bar: 1, new: 1 } })
      expect(oneToMany['new'][0]).toBe(item8)
    })
  })
  
  describe('updateItem', () => {
    let oneToOne, oneToMany
    const items = [...testItems]
    const newItem = { id: 3, type: 'new' }
    
    beforeAll(() => {
      const indexManager = new IndexManager({ items })
      oneToOne = indexManager.getIndex('byId')
      oneToMany = indexManager.addIndex(oneToManySpec)
      
      items.splice(2, 1, newItem)
      indexManager.updateItem(newItem)
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
})
