/* globals beforeAll describe expect test */
import { Organization } from '../../orgs'
import { StaffMember } from '../StaffMember'

describe('StaffMember', () => {
  let org
  beforeAll(() => {
    org = new Organization({ dataPath : './js/test-data' })
  })

  test.each`
  email | roleName | isActing
  ${'ceo@foo.com'} | ${'CTO'} | ${true}
  ${'ceo@foo.com'} | ${'CEO'} | ${undefined}
  ${'dev@foo.com'} | ${'Developer'} | ${undefined}
  `('$email is acting in $roleName : $isActing', ({ email, roleName, isActing }) =>
    expect(org.staff.get(email).getRole(roleName).acting).toBe(isActing))

  test.each`
  givenName | familyName | options | fullName
  ${'John'} | ${'Smith'} | ${undefined} | ${'John Smith'}
  ${'John'} | ${'Smith'} | ${{ officialFormat : true }} | ${'Smith, John'}
  `('given: $givenName, family: $familyName, options: $options -> $fullName',
    ({ givenName, familyName, options, fullName }) => {
      const data = {
        email            : 'notused@foo.com',
        givenName,
        familyName,
        startDate        : '2022-01-01',
        roles            : [{ name : 'Developer', manager : 'ceo@foo.com' }],
        employmentStatus : 'employee'
      }
      const staffMember = new StaffMember(data, { org })
      expect(staffMember.getFullName(options)).toBe(fullName)
    }
  )

  test.each`
  givenName | familyName | options | good
  ${'John'} | ${undefined} | ${undefined} | ${true}
  ${undefined} | ${'Smith'} | ${undefined} | ${false}
  ${'John'} | ${undefined} | ${{ officialFormat : true }} | ${true}
  ${undefined} | ${'Smith'} | ${{ officialFormat : true }} | ${false}
  `('given: $givenName, family: $familyName, options: $options is good: $good',
    ({ givenName, familyName, options, good }) => {
      const data = {
        email            : 'notused@foo.com',
        givenName,
        familyName,
        startDate        : '2022-01-01',
        roles            : [{ name : 'Developer', manager : 'ceo@foo.com' }],
        employmentStatus : 'employee'
      }
      if (!good) {
        expect(() => new StaffMember(data, { org })).toThrow(/missing.*field.*(?:givenName|familyName)/)
      }
      else {
        expect(() => new StaffMember(data, { org })).not.toThrow()
      }
    })

  test('processes designated role (Sensitive Data Handler)', () => {
    const dev = org.staff.get('dev@foo.com')
    expect(dev.getOwnRoleNames()).toHaveLength(4) // 2 assigned and 2 implicit
    expect(dev.hasRole('Sensitive Data Handler')).toBe(true)
  })
})
