/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Audits } from '../Audits'

describe('Audits', () => {
  let audits = null
  
  beforeAll(() => {
    const auditData = JSON.parse(fs.readFileSync('./js/test-data/orgs/audits.json'))
    audits = new Audits(auditData)
  })
  
  describe('getByTarget', () => {
    test('should return only matching audits', () => {
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
