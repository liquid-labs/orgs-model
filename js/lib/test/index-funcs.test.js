/* globals beforeAll describe expect test */
import * as indexes from '../index-funcs.js'
import * as idxRelationships from '../index-relationships.js'

const testItems = [
  { id: 1, type: 'foo' },
  { id: 2, type: 'bar' },
  { id: 3, type: 'foo' }
]

describe('indexes', () => {
  const verifyTestItems1to1 = (index) => {
    expect(Object.keys(index)).toHaveLength(3)
    for (const testItem of testItems) {
      expect(index[testItem.id]).toBe(testItem)
    }
  }
  
  const verifyTestItems1ToMany = (index) => {
    expect(Object.keys(index)).toHaveLength(2)
    expect(index.foo).toHaveLength(2)
    expect(index.bar).toHaveLength(1)
    for (const testItem of testItems) {
      expect(index[testItem.type].includes(testItem)).toBe(true)
    }
  }
  
  describe('rebuild', () => {
    describe('for one-to-one indexes', () => {
      const index = { 8: 'old entry' }
      beforeAll(() => {
        indexes.rebuild({
          items: testItems,
          indexSpec: { relationship: idxRelationships.ONE_TO_ONE, index, keyField: 'id' }
        })
      })
      
      test('creates a valid one-to-one index', () => verifyTestItems1to1(index))
      
      test('removes old entries', () => expect(index[8]).toBeUndefined())
    }) // end rebuild/one-to-one
    
    describe('for one-to-mane indexes', () => {
      const index = { 'baz': ['old entry']}
      beforeAll(() => {
        
        indexes.rebuild({
          items: testItems,
          indexSpec: { relationship: idxRelationships.ONE_TO_MANY, index, keyField: 'type' }
        })
      })
      
      test('creates a valid one-to-many index', () => verifyTestItems1ToMany(index))
      
      test('removes old entries', () => expect(index['baz']).toBeUndefined())
    }) // end rebuild/one-to-many
  }) // end rebuild
  
  describe('rebuildAll', () => {
    const index1to1 = { 8: 'old entry' }
    const index1toMany = { 'baz': ['old entry'] }
    beforeAll(() => {
      const indexSpecs = [
        { relationship: idxRelationships.ONE_TO_ONE, index: index1to1, keyField: 'id' },
        { relationship: idxRelationships.ONE_TO_MANY, index: index1toMany, keyField: 'type' }
      ]
      
      indexes.rebuildAll({ items: testItems, indexSpecs })
    })
    
    test('properly rebuilds multiple indexes', () => {
      verifyTestItems1to1(index1to1)
      verifyTestItems1ToMany(index1toMany)
    })
    
    test('removes old entries', () => {
      expect(index1to1[8]).toBeUndefined()
      expect(index1toMany['baz']).toBeUndefined()
    })
  })
})
