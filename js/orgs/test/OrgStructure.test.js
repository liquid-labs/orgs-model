/* globals beforeAll describe expect test */
import * as fs from 'fs'
import { Roles } from '../../roles'
import { OrgStructure } from '../OrgStructure'

describe('OrgStructure', () => {
  let roles
  let orgStructure
  beforeAll(() => {
    roles = new Roles({}, JSON.parse(fs.readFileSync('./js/test-data/orgs/roles/roles.json')))
    orgStructure = new OrgStructure('./js/test-data/orgs/org_structure.json', roles)
  })

  test('successfull loads test file', () => {
    expect(orgStructure).not.toBe(undefined)
    expect(orgStructure.getRoots().length).toEqual(1)
    expect(orgStructure.getNodes().length).toEqual(4)
  })

  test('can retrieve a node by name', () => {
    const node = orgStructure.getNodeByRoleName('Developer')
    expect(node).not.toBe(undefined)
    expect(node.getName()).toEqual('Developer')
    expect(node.getChildren()).toEqual([])
  })

  test('detects duplicate roles in structure', () => {
    expect(() => new OrgStructure('./js/test-data/orgs/org_structure-dupe.json', roles))
      .toThrow(/non-unique.*CEO/)
  })

  test('detects bad manager-role reference', () => {
    expect(() => new OrgStructure('./js/test-data/orgs/org_structure-bad-manager.json', roles))
      .toThrow(/Invalid.*Bad Manager/)
  })

  describe('nodes', () => {
    test.each`
    name | count
    ${'CEO'} | ${3}
    ${'CTO'} | ${2}
    ${'Developer'} | ${0}
    `('expect $count descendents for node \'$name\'', ({ name, count }) => {
      expect(orgStructure.getNodeByRoleName(name).getDescendents()).toHaveLength(count)
    })

    test.each`
    name | count
    ${'CEO'} | ${4}
    ${'CTO'} | ${3}
    ${'Developer'} | ${1}
    `('expect $count tree nodes for node \'$name\'', ({ name, count }) => {
      expect(orgStructure.getNodeByRoleName(name).getTreeNodes()).toHaveLength(count)
    })

    test('\'CEO\' has null parent', () => {
      expect(orgStructure.getNodeByRoleName('CEO').getPrimaryManagerNode()).toBe(null)
    })

    test.each`
    name | mngrName
    ${'CTO'} | ${'CEO'}
    ${'Developer'} | ${'CTO'}
    `('\'$name\' has primary manager \'$mngrName\'', ({ name, mngrName }) => {
      expect(orgStructure.getNodeByRoleName(name).getPrimaryManagerNode().getName()).toEqual(mngrName)
    })

    test.each`
    name | mngrs
    ${'CTO'} | ${['CEO']}
    ${'Developer'} | ${['CTO', 'Developer']}
    `('\'$name\' has possible managers \'$mngrs\'', ({ name, mngrs }) => {
      expect(orgStructure.getNodeByRoleName(name).getPossibleManagerNodes().map(m => m.getName())).toEqual(mngrs)
    })
  })
})
