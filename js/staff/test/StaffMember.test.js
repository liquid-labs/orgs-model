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
  ${'ceo@foo.com'} | ${'CEO'} | ${false}
  ${'dev@foo.com'} | ${'Developer'} | ${false}
  `('$email is acting in $roleName : $isActing', ({ email, roleName, isActing }) =>
    expect(org.getStaff().get(email).getAttachedRole(roleName).isActing()).toBe(isActing)
  )

  test.each`
  givenName | familyName | options | fullName
  ${'John'} | ${'Smith'} | ${undefined} | ${'John Smith'}
  ${'John'} | ${undefined} | ${undefined} | ${'John'}
  ${undefined} | ${'Smith'} | ${undefined} | ${'Smith'}
  ${'John'} | ${'Smith'} | ${{ officialFormat : true }} | ${'Smith, John'}
  ${'John'} | ${undefined} | ${{ officialFormat : true }} | ${'John'}
  ${undefined} | ${'Smith'} | ${{ officialFormat : true }} | ${'Smith'}
  `('given: $givenName, family: $familyName, options: $options -> $fullName',
    ({ givenName, familyName, options, fullName }) => {
      const staffMember = new StaffMember({ givenName : givenName, familyName : familyName })
      expect(staffMember.getFullName(options)).toBe(fullName)
    }
  )

  test('processes designated role (Sensitive Data Handler)', () => {
    const dev = org.getStaff().get('dev@foo.com')
    expect(dev.getRoleNames()).toHaveLength(2)
    expect(dev.hasRole('Sensitive Data Handler')).toBe(true)
  })
})
