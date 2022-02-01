/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Roles } from '..'

describe('Role', () => {
  let roles
  beforeAll(() => {
    roles = new Roles({}, JSON.parse(fs.readFileSync('./js/test-data/orgs/roles/roles.json')))
  })

  test.each`
  roleName | isQualifiable
  ${'Developer'} | ${true}
  ${'CEO'} | ${false}
  `('Role \'$roleName\' is qualifiable: $isQualifiable', ({ roleName, isQualifiable }) =>
    expect(roles.get(roleName).isQualifiable()).toBe(isQualifiable))
})
