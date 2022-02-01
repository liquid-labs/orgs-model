/* globals beforeAll describe expect test */
import { Organization } from '../../orgs'
import { StaffMember } from '../StaffMember'

describe('StaffMember', () => {
  let org
  beforeAll(() => {
    org = new Organization('./js/test-data', './js/staff/test/staff.json')
  })

  test.each`
  email | roleName | isActing
  ${'ceo@foo.com'} | ${'CTO'} | ${true}
  ${'ceo@foo.com'} | ${'CEO'} | ${undefined}
  ${'dev@foo.com'} | ${'Developer'} | ${undefined}
  `('$email is acting in $roleName : $isActing', ({ email, roleName, isActing }) =>
    expect(org.staff.get(email).getRole(roleName).acting).toBe(isActing)
  )

  test.each`
  givenName | familyName | options | fullName
  ${'John'} | ${'Smith'} | ${undefined} | ${'John Smith'}
  ${'John'} | ${'Smith'} | ${{ officialFormat : true }} | ${'Smith, John'}
  `('given: $givenName, family: $familyName, options: $options -> $fullName',
    ({ givenName, familyName, options, fullName }) => {
      const data = {
        email: 'notused@foo.com',
        givenName,
        familyName,
        startDate: '2022-01-01',
        roles: [ { name: 'Developer' } ],
        employmentStatus: 'employee'
      }
      const staffMember = new StaffMember(data, { org })
      expect(staffMember.getFullName(options)).toBe(fullName)
    }
  )
  
  test.each`
  givenName | familyName | options
  ${'John'} | ${undefined} | ${undefined}
  ${undefined} | ${'Smith'} | ${undefined}
  ${'John'} | ${undefined} | ${{ officialFormat : true }}
  ${undefined} | ${'Smith'} | ${{ officialFormat : true }}
  `('given: $givenName, family: ${familyName}, options: ${options} raises an error',
    ({ givenName, familyName, options }) => {
      const data = {
        email: 'notused@foo.com',
        givenName,
        familyName,
        startDate: '2022-01-01',
        roles: [ { name: 'Developer' } ],
        employmentStatus: 'employee'
      }
      expect(() => new StaffMember(data, { org })).toThrow(/Missing required field/)
    })

  test('processes designated role (Sensitive Data Handler)', () => {
    const dev = org.staff.get('dev@foo.com')
    expect(dev.getOwnRoleNames()).toHaveLength(2)
    expect(dev.hasRole('Sensitive Data Handler')).toBe(true)
  })
})
