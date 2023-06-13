/* globals beforeAll describe expect test */
import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { Roles } from '../Roles'

const rolesDataPath = fsPath.join(__dirname, '..', '..', 'test-data', 'orgs', 'roles', 'roles.json')

const mockOrg = {
  roles : null // we'll actually set it up after creating 'roles'
}

describe('Role', () => {
  let roles
  beforeAll(() => {
    roles = new Roles({ items : JSON.parse(fs.readFileSync(rolesDataPath)), org : mockOrg })
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
