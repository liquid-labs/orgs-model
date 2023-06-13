/* globals beforeAll describe expect test */
import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { Roles } from '../Roles'

const rolesDataPath = fsPath.join(__dirname, '..', '..', 'test-data', 'orgs', 'roles', 'roles.json')
const rolesData = JSON.parse(fs.readFileSync(rolesDataPath))

const /* mock */org = {
  orgStructure : {
    getNodeByRoleName : (name) => {
      return Object.assign({ implied : false }, rolesData.find((r) => r.name === name))
    }
  }
}

describe('Roles', () => {
  let testRoles
  beforeAll(() => {
    testRoles = new Roles({ items : rolesData, org })
  })

  test('parses test file', () => {
    expect(testRoles).toBeTruthy()
    expect(testRoles.list()).toHaveLength(12)
  })

  describe('list', () => {
    // CEO is first in the underlying list
    test("respects 'sort=false' option", () =>
      expect(testRoles.list({ sort : false }).some((r) => r.name === 'CEO')).toBe(true))

    test("respects 'excludeDesignated=true' option", () => {
      const roles = testRoles.list({ excludeDesignated : true })
      expect(roles).toHaveLength(6) // 6 of 12 are designated
      for (const role of roles) {
        expect(role.titular).toBe(true)
        expect(role.designated).toBe(undefined)
      }
    })

    test("'notTitular=true' excludes titular roles", () => {
      const roles = testRoles.list({ excludeTitular : true })
      expect(roles).toHaveLength(6) // 6 of 12 are titular
      for (const role of roles) {
        expect(role.titular).toBe(undefined)
        expect(role.designated).toBe(true)
      }
    })

    test("'notTitular=true' and 'includeIndirect=true' excludes titular roles", () => {
      const roles = testRoles.list({ excludeTitular : true, includeIndirect : true })
      expect(roles).toHaveLength(6) // 6 of 12 are titular
      for (const role of roles) {
        expect(role.titular).toBe(undefined)
        expect(role.designated).toBe(true)
      }
    })
  })
})
