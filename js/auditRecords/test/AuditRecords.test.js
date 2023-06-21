/* global beforeAll describe expect test */
import * as fsPath from 'node:path'

import { AuditRecords } from '../AuditRecords'

const auditRecordsaDataPath = fsPath.join(__dirname, '..', '..', 'test-data', 'orgs', 'audits', 'audit-records.json')

describe('AuditRecords', () => {
  let auditRecords
  beforeAll(() => {
    auditRecords = new AuditRecords({ fileName : auditRecordsaDataPath, readFromFile : true })
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
