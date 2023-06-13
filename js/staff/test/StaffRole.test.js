/* globals beforeAll describe expect test */
import * as fsPath from 'node:path'

import { Organization } from '../../orgs'

const ceoEmail = 'ceo@foo.com'

const orgDataPath = fsPath.join(__dirname, '..', '..', 'test-data')
const impliedOrgDataPath = fsPath.join(orgDataPath, 'implied')

describe('StaffRole', () => {
  let org
  beforeAll(() => { org = new Organization({ dataPath : orgDataPath }) })

  test.each`
  email | roleName
  ${'dev@foo.com'} | ${'Developer'}
  ${'ceo@foo.com'}| ${'CEO'}
  `('\'$email\' role \'$roleName\' presents expected name', ({ email, roleName }) => {
    expect(org.staff.get(email).getRole(roleName).name).toBe(roleName)
  })

  describe('qualifiers', () => {
    test('are detected when invalid', () => {
      expect(() => new Organization({
        dataPath  : orgDataPath,
        // this is relative to the root FJSON file
        overrides : { '.staff' : 'file:../../staff/test/data/invalid_qualifier_staff.json' }
      }))
        .toThrow(/CTO.*not qualifiable.*ceo@foo\.com/)
    })

    test.each`
    email | roleName | isQualifiable
    ${'dev@foo.com'} | ${'Developer'} | ${true}
    ${'ceo@foo.com'}| ${'CEO'} | ${false}
    `('\'$email\' role \'$roleName\' is qualifiable: $isQualifiable', ({ email, roleName, isQualifiable }) => {
      expect(org.staff.get(email).getRole(roleName).isQualifiable()).toBe(isQualifiable)
    })

    test.each`
    email | roleName | qualifier
    ${'uidev@foo.com'} | ${'Developer'} | ${'UI'}
    ${'dev@foo.com'} | ${'Developer'} | ${undefined}
    ${'ceo@foo.com'} | ${'CEO'} | ${undefined}
    `('\'$email\' role \'$roleName\' has \'$qualifier\' qualifier.', ({ email, roleName, qualifier }) => {
      expect(org.staff.get(email).getRole(roleName).qualifier).toBe(qualifier)
    })
  })

  describe('implied roles', () => {
    let impliedOrg
    let ceo
    beforeAll(() => {
      impliedOrg = new Organization({ dataPath : impliedOrgDataPath })
      ceo = impliedOrg.staff.get(ceoEmail)
    })

    test("implied-CEO has implied titular role 'Head Developer'", () => {
      expect(ceo.hasRole('Head Developer')).toBe(true)
      expect(ceo.getRole('Head Developer')).toBeTruthy()
    })

    test("implied-CEO has implied non-titular role 'Sensitive Data Handler'", () => {
      expect(ceo.hasRole('Sensitive Data Handler')).toBe(true)
      expect(ceo.getRole('Sensitive Data Handler')).toBeTruthy()
    })

    test("implied CEO is their own manager as 'Head Developer'", () =>
      expect(ceo.getRole('Head Developer').managerEmail).toBe(ceoEmail))
  })
})
