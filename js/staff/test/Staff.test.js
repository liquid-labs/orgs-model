/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Staff } from '../Staff'
import { StaffMember } from '../StaffMember'
import { Organization } from '../../orgs'

describe('Staff', () => {
  let testStaff
  let org
  beforeAll(() => {
    org = new Organization({ dataPath: './js/test-data' })
    // TODO: the way we end up hydrating kinda breaks unit test isolation?
    testStaff = org.staff
  })

  test('detects duplicate emails on init', () =>
    expect(() => new Staff({ fileName: './js/staff/test/dupe_email_staff.json', org, readFromFile: true }))
      .toThrow(/email.*ceo@foo.com/))

  test('filters header+blank lines', () => expect(testStaff.list()).toHaveLength(4))

  test('fields', () => {
    const ceo = testStaff.get('ceo@foo.com')
    expect(ceo.email).toBe('ceo@foo.com')
    expect(ceo.getAllRoles()).toHaveLength(2)
    const ceoRole = ceo.getAllRoles()[0]
    expect(ceoRole.name).toBe('CEO')
    expect(ceoRole.manager).toBe(undefined)
    expect(ceoRole.acting).toBe(undefined)
    const ctoRole = ceo.getAllRoles()[1]
    expect(ctoRole.name).toBe('CTO')
    expect(ctoRole.getManager().email).toBe('ceo@foo.com')
    expect(ctoRole.acting).toBe(true)
    expect(ceo.employmentStatus).toEqual('employee')
    const dev = testStaff.list()[1]
    expect(dev.getAllRoles()[0].name).toBe('Developer')
    expect(dev.getAllRoles()[0].managerEmail).toBe('ceo@foo.com')
  })
  
  describe('list', () => {
    test('by default provides a list of objects which is safe to manipulate', () => {
      const result = testStaff.list()
      expect(result[0] instanceof StaffMember).toBe(true)
      const origLength = result.length
      result.splice(0, 1)
      expect(testStaff.list({ rawData: true })).toHaveLength(origLength)
    })
    
    test('can provide raw data which is safe to manipulate', () => {
      const result = testStaff.list({ rawData: true })
      expect(result instanceof StaffMember).toBe(false)
      const origLength = result.length
      result.splice(0, 1)
      expect(testStaff.list({ rawData: true })).toHaveLength(origLength)
    })
  })

  describe('checkCondition', () => {
    test.each`
      desc | condition | expectation
      ${'employee status'} | ${'IS_EMPLOYEE'} | ${['ceo@foo.com', 'dev@foo.com']}
      ${'contractor status'} | ${'IS_CONTRACTOR'} | ${['uidev@foo.com', 'test@foo.com']}
      ${'titular roles'} | ${'HAS_CEO_ROLE'} | ${['ceo@foo.com']}
      ${'designated roles'} | ${'HAS_SENSITIVE_DATA_HANDLER_ROLE'} | ${['dev@foo.com']}
    `('properly evaluates $desc ($condition)', ({ desc, condition, expectation }) => {
      const members = testStaff.list().filter((member) => Staff.checkCondition(condition, member))
      expect(members.map(e => e.email).sort()).toEqual(expectation.sort())
    })
  })
})
