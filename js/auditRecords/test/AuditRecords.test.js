/* global beforeAll describe expect test */

import { AuditRecords } from '../'

describe('AuditRecords', () => {
  let auditRecords
  beforeAll(() => {
    auditRecords = new AuditRecords({ fileName : './js/test-data/orgs/audit-records.json', readFromFile : true })
  })

  describe('getByAuditId', () => {
    test('will retrieve indexed values', () => {
      const group = auditRecords.getByAuditId('vendors-data-audit')
      expect(group).toHaveLength(3)
      for (const record of group) {
        expect(record.auditId).toBe('vendors-data-audit')
      }
    })
  })

  describe('getByDomain', () => {
    test('will retrieve indexed values', () => {
      const group = auditRecords.getByDomain('vendors')
      expect(group).toHaveLength(3)
      for (const record of group) {
        expect(record.domain).toBe('vendors')
      }
    })
  })

  describe('getByTargetId', () => {
    test('will retrieve indexed values', () => {
      const group = auditRecords.getByTargetId('AWS CloudTrail')
      expect(group).toHaveLength(1)
      expect(group[0].targetId).toBe('AWS CloudTrail')
    })
  })
})
