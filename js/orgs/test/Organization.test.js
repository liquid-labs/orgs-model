/* globals beforeAll describe expect test */
import { Organization } from '../'

describe('Organization', () => {
  let org
  beforeAll(() => {
    org = new Organization('./js/test-data', './js/staff/test/staff.json')
  })

  test('detects staff with invalid roles', () => {
    expect(() =>
      new Organization('./js/test-data', './js/staff/test/bad_role_staff.json'))
      .toThrow(/Bad Role.*badrole@foo\.com/)
  })

  test('detects staff with invalid manaagers', () => {
    expect(() =>
      new Organization('./js/test-data', './js/staff/test/bad_manager_staff.json'))
      .toThrow(/nosuchmngr@foo\.com.*badmanager@foo\.com/)
  })

  test('successfully initializes with good data', () => expect(org).not.toBe(undefined))

  test('loads basic staff data', () => {
    const ceo = org.staff.get('ceo@foo.com')
    expect(ceo).not.toBe(undefined)
    expect(ceo.getGivenName()).toEqual('CEO')
  })

  test('loads basic role data', () => {
    const role = org.getRoles().get('CTO')
    expect(role).not.toBe(undefined)
    expect(role.getName()).toEqual('CTO')
  })

  describe('fills out org chart', () => {
    test.each`
    email | roleName | managerEmail
    ${'ceo@foo.com'} | ${'CTO'} | ${'ceo@foo.com'}
    ${'dev@foo.com'} | ${'Developer'} | ${'ceo@foo.com'}
    `('$email as $roleName managed by $managerName', ({ email, roleName, managerEmail }) => {
      expect(org.staff.get(email).getRole(roleName).getManager().getEmail()).toEqual(managerEmail)
    })

    test.each`
    managerEmail | roleName | reportCount
    ${'ceo@foo.com'} | ${'Developer'} | ${1}
    ${'ceo@foo.com'} | ${'Tester'} | ${1}
    ${'dev@foo.com'} | ${'Developer'} | ${1}
    ${'test@foo.com'} | ${'Developer'} | ${0}
    `('$managerEamil manages $reportCount $roleName staff', ({ managerEmail, roleName, managerName, reportCount }) => {
      expect(org.staff.get(managerEmail).getReportsByRoleName(roleName)).toHaveLength(reportCount)
    })

    test.each`
    email | reportCount
    ${'ceo@foo.com'} | ${2}
    ${'dev@foo.com'} | ${1}
    ${'test@foo.com'} | ${0}
    `('$email has $reportCount total reports', ({ email, roleName, managerName, reportCount }) => {
      expect(org.staff.get(email).getReports()).toHaveLength(reportCount)
    })
  })

  describe('getStaff', () => {
    test('returns a list of 4 staff', () => {
      const staff = org.staff.list()
      expect(staff).toHaveLength(4)
      expect(staff.findIndex(s => s.getEmail() === 'dev@foo.com')).not.toEqual(-1)
      expect(staff.findIndex(s => s.getEmail() === 'uidev@foo.com')).not.toEqual(-1)
    })
  })

  describe('getByRoleName', () => {
    test('returns array of staff matching role', () => {
      const staff = org.staff.getByRoleName('Developer')
      expect(staff).toHaveLength(2)
      expect(staff.findIndex(s => s.getEmail() === 'dev@foo.com')).not.toEqual(-1)
      expect(staff.findIndex(s => s.getEmail() === 'uidev@foo.com')).not.toEqual(-1)
    })

    test('returns empty array with no matching staff', () => expect(org.staff.getByRoleName('blah')).toEqual([]))
  })

  describe('generateOrgChartData', () => {
    test('for debang/OrgChart', () => {
      // console.log(JSON.stringify(org.generateOrgChartData('debang/OrgChart')))
      const expected = { id : 'ceo@foo.com/CEO', ids : ['ceo@foo.com/CEO', 'ceo@foo.com/CTO'], parent_id : '', email : 'ceo@foo.com', name : 'CEO Foo', titles : ['CEO', 'CTO'], roles : [{ name : 'CEO', singular : true, titular : true, jobDescription : 'Chief executive officer.' }, { name : 'CTO', singular : true, titular : true, jobDescription : 'Chief technical officer.' }], children : [{ id : 'dev@foo.com/Developer', ids : ['dev@foo.com/Developer'], parent_id : 'ceo@foo.com/CTO', email : 'dev@foo.com', name : 'Dev Bar', titles : ['Developer'], roles : [{ name : 'Developer', titular : true, qualifiable : true, jobDescription : 'Hacker.' }], children : [{ id : 'uidev@foo.com/Developer', ids : ['uidev@foo.com/Developer'], parent_id : 'dev@foo.com/Developer', email : 'uidev@foo.com', name : 'UI Bar', titles : ['UI Developer'], roles : [{ name : 'Developer', titular : true, qualifiable : true, jobDescription : 'Hacker.' }] }] }, { id : 'test@foo.com/Tester', ids : ['test@foo.com/Tester'], parent_id : 'ceo@foo.com/CTO', email : 'test@foo.com', name : 'Test Baz', titles : ['Tester'], roles : [{ name : 'Tester', titular : true, qualifiable : true, jobDescription : 'QA.' }] }] }
      expect(org.generateOrgChartData('debang/OrgChart')).toEqual(expected)
    })

    test('for GoogleCharts org chart', () => {
      const expected = [['ceo@foo.com/CEO', '', null], ['ceo@foo.com/CTO', 'ceo@foo.com/CEO', null], ['dev@foo.com/Developer', 'ceo@foo.com/CTO', null], ['test@foo.com/Tester', 'ceo@foo.com/CTO', null], ['uidev@foo.com/Developer', 'dev@foo.com/Developer', 'UI']]
      expect(org.generateOrgChartData('google-chart')).toEqual(expected)
    })

    test('raises exception when presented with unknown chart style', () => {
      expect(() => org.generateOrgChartData('blah')).toThrow(/blah.*is not supported/i)
    })
  })
})
