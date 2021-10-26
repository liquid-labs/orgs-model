/* globals beforeAll describe expect test */
import { Organization } from '../../orgs'

describe('AttachedRole', () => {
  let org
  beforeAll(() => {
    org = new Organization('./js/test-data', './js/staff/test/staff.json')
  })

  test.each`
  email | roleName
  ${'dev@foo.com'} | ${'Developer'}
  ${'ceo@foo.com'}| ${'CEO'}
  `('\'$email\' role \'$roleName\' presents expected name', ({ email, roleName }) => {
    expect(org.getStaff().get(email).getAttachedRole(roleName).getName()).toBe(roleName)
  })

  describe('qualifiers', () => {
    test('are detected when invalid', () => {
      expect(() => new Organization('./js/test-data', './js/staff/test/invalid_qualifier_staff.json'))
        .toThrow(/non-qualifiable role.*CTO.*ceo@foo\.com/)
    })

    test.each`
    email | roleName | isQualifiable
    ${'dev@foo.com'} | ${'Developer'} | ${true}
    ${'ceo@foo.com'}| ${'CEO'} | ${false}
    `('\'$email\' role \'$roleName\' is qualifiable: $isQualifiable', ({ email, roleName, isQualifiable }) => {
      expect(org.getStaff().get(email).getAttachedRole(roleName).isQualifiable()).toBe(isQualifiable)
    })

    test.each`
    email | roleName | qualifier
    ${'uidev@foo.com'} | ${'Developer'} | ${'UI'}
    ${'dev@foo.com'} | ${'Developer'} | ${null}
    ${'ceo@foo.com'} | ${'CEO'} | ${null}
    `('\'$email\' role \'$roleName\' has \'$qualifier\' qualifier.', ({ email, roleName, qualifier }) => {
      expect(org.getStaff().get(email).getAttachedRole(roleName).getQualifier()).toBe(qualifier)
    })
  })
})
