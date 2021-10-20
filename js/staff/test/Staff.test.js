/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Staff } from '../Staff'
import { Organization } from '../../orgs'

describe('Staff', () => {
  let testStaff
  beforeAll(() => {
    const org = new Organization('./js/test-data', './js/staff/test/staff.json')
    // TODO: the way we end up hydrating kinda breaks unit test isolation?
    testStaff = org.getStaff()
  })

  test('detects duplicate emails on init', () =>
    expect(() => new Staff('./js/staff/test/dupe_email_staff.json'))
      .toThrow(/email.*ceo@foo.com/))

  test('filters header+blank lines', () => expect(testStaff.getAll()).toHaveLength(4))

  test('fields', () => {
    const ceo = testStaff.getAll()[0]
    expect(ceo.getEmail()).toBe('ceo@foo.com')
    expect(ceo.getAttachedRoles()).toHaveLength(2)
    const ceoRole = ceo.getAttachedRoles()[0]
    expect(ceoRole.getName()).toBe('CEO')
    expect(ceoRole.getManager()).toBeNull()
    expect(ceoRole.isActing()).toBe(false)
    const ctoRole = ceo.getAttachedRoles()[1]
    expect(ctoRole.getName()).toBe('CTO')
    expect(ctoRole.getManager().getEmail()).toBe('ceo@foo.com')
    expect(ctoRole.isActing()).toBe(true)
    expect(ceo.getEmploymentStatus()).toEqual('employee')
    const dev = testStaff.getAll()[1]
    expect(dev.getAttachedRoles()[0].getName()).toBe('Developer')
    expect(dev.getAttachedRoles()[0].getManager().getEmail()).toBe('ceo@foo.com')
  })

  test('toString()', () => {
    const out = testStaff.toString()
    // console.log(out)
    const data = JSON.parse(out)
    const expected = JSON.parse(fs.readFileSync('./js/staff/test/staff.json'))

    expect(data).toEqual(expected)
  })

  describe('checkCondition', () => {
    test.each`
      desc | condition | expectation
      ${'employee status'} | ${'IS_EMPLOYEE'} | ${['ceo@foo.com', 'dev@foo.com']}
      ${'contractor status'} | ${'IS_CONTRACTOR'} | ${['uidev@foo.com', 'test@foo.com']}
      ${'titular roles'} | ${'HAS_CEO_ROLE'} | ${['ceo@foo.com']}
      ${'designated roles'} | ${'HAS_SENSITIVE_DATA_HANDLER_ROLE'} | ${['dev@foo.com']}
    `('properly evaluates $desc ($condition)', ({ desc, condition, expectation }) => {
      const members = testStaff.getAll().filter((member) => Staff.checkCondition(condition, member))
      expect(members.map(e => e.getEmail())).toEqual(expectation)
    })
  })
})
