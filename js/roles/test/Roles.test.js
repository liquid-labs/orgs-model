/* globals beforeAll describe expect test */
import * as fs from 'fs'

import { Roles } from '..'

const rolesData = JSON.parse(fs.readFileSync('./js/test-data/orgs/roles/roles.json'))

const /* mock */org = {
  orgStructure : {
    getNodeByRoleName: (name) => {
      return Object.assign({ implied: false }, rolesData.find((r) => r.name === name))
    }
  }
}

describe('Roles', () => {
  let testRoles
  beforeAll(() => {
    testRoles = new Roles({ items: rolesData, org })
  })

  test('parses test file', () => {
    expect(testRoles).toBeTruthy()
    expect(testRoles.list()).toHaveLength(11)
  })

  describe('list', () => {
    // CEO is first in the underlying list
    test("respects 'sort=false' option", () =>
      expect(testRoles.list({ sort: false }).some((r) => r.name === 'CEO')).toBe(true))
      
    test("respects 'excludeDesignated=true' option", () =>
      expect(testRoles.list({ excludeDesignated: true })).toHaveLength(5)) // 6 of 11 are designated
  })
})
