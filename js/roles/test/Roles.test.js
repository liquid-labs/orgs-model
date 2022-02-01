/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Roles } from '..'

describe('Roles', () => {
  let testRoles
  beforeAll(() => {
    testRoles = new Roles({}, JSON.parse(fs.readFileSync('./js/test-data/orgs/roles/roles.json')))
  })

  test('parses test file', () => {
    expect(testRoles).toBeTruthy()
    expect(testRoles.list()).toHaveLength(8)
  })

  // CEO is first in the underlying list
  test('properly sets fields', () =>
    expect(testRoles.list({ sort: false }).some((r) => r.name === 'CEO')).toBe(true))
})
