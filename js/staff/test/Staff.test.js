/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Staff } from '../Staff'
import { Organization } from '../../orgs'

describe('Staff', () => {
  let testStaff
  let org
  beforeAll(() => {
    org = new Organization('./js/test-data', './js/staff/test/staff.json')
    // TODO: the way we end up hydrating kinda breaks unit test isolation?
    testStaff = org.staff
  })

  test('detects duplicate emails on init', () =>
    expect(() => new Staff({ fileName: './js/staff/test/dupe_email_staff.json', org }))
      .toThrow(/email.*ceo@foo.com/))

  test('filters header+blank lines', () => expect(testStaff.list()).toHaveLength(4))

  test('fields', () => {
    const ceo = testStaff.list()[0]
    expect(ceo.getEmail()).toBe('ceo@foo.com')
    expect(ceo.allRoles).toHaveLength(2)
    const ceoRole = ceo.allRoles[0]
    expect(ceoRole.name).toBe('CEO')
    expect(ceoRole.manager).toBe(undefined)
    expect(ceoRole.acting).toBe(undefined)
    const ctoRole = ceo.allRoles[1]
    expect(ctoRole.name).toBe('CTO')
    expect(ctoRole.getManager().getEmail()).toBe('ceo@foo.com')
    expect(ctoRole.acting).toBe(true)
    expect(ceo.getEmploymentStatus()).toEqual('employee')
    const dev = testStaff.list()[1]
    expect(dev.allRoles[0].name).toBe('Developer')
    expect(dev.allRoles[0].managerEmail).toBe('ceo@foo.com')
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
      expect(members.map(e => e.getEmail())).toEqual(expectation)
    })
  })
})
