/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Audits } from '../Audits'

describe('Audits', () => {
  let audits = null
  
  beforeAll(() => {
    audits = new Audits({ fileName: './js/test-data/orgs/audits.json', readFromFile : true })
  })
  
  describe('getByTarget', () => {
    test('should return only distinct matching audits ]by default', () => {
      const target = 'repository'
      const matches = audits.getByTarget(target)
      expect(matches).toHaveLength(2)
      for (const match of matches) expect(match.target).toBe(target)
    })
    
    test('should return an empty array when there are no matches', () => {
      const matches = audits.getByTarget('this is not a valid target')
      expect(Array.isArray(matches)).toBe(true)
      expect(matches).toHaveLength(0)
    })
  })
  
})
