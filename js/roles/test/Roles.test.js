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
    expect(testRoles.getAll()).toHaveLength(8)
  })

  test('properly sets fields', () => expect(testRoles.getAll()[0].getName()).toBe('CEO'))
})
