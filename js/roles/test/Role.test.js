/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Roles } from '..'

const mockOrg = {
  roles : null // we'll actually set it up after creating 'roles'
}

describe('Role', () => {
  let roles
  beforeAll(() => {
    roles = new Roles({ items : JSON.parse(fs.readFileSync('./js/test-data/orgs/roles/roles.json')), org : mockOrg })
    mockOrg.roles = roles
  })

  test.each`
  roleName | isQualifiable
  ${'Developer'} | ${true}
  ${'CEO'} | ${false}
  `('Role \'$roleName\' is qualifiable: $isQualifiable', ({ roleName, isQualifiable }) =>
    expect(roles.get(roleName).isQualifiable()).toBe(isQualifiable))

  test("'imliedRoleNames' finds super and implied roles", () => {
    const baseRole = roles.get('Lead Developer')
    const impliedRoleNames = baseRole.allImpliedRoleNames
    expect(impliedRoleNames).toHaveLength(3)
    for (const impliedRoleName of ['Senior Developer', 'Developer', 'Sensitive Data Handler']) {
      expect(impliedRoleNames.indexOf(impliedRoleName)).toBeGreaterThan(-1)
    }
  })
})
