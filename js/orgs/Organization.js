import { statSync } from 'node:fs'

import { OrgStructure } from './OrgStructure'
import { JSONLoop } from './lib/JSONLoop'

import { Accounts } from '../accounts'
import { AuditRecords } from '../auditRecords'
import { Audits } from '../audits'
import { Roles } from '../roles'
import { Sources } from '../alerts/sources'
import { Staff } from '../staff'
import { Technologies } from '../technologies'
import { Vendors } from '../vendors'
import { loadOrgState } from '../lib/org-state'

const Organization = class {
  #cachedPlayground
  #innerState

  constructor({ dataPath, ...rest }) {
    this.#innerState = loadOrgState({ dataPath, ...rest })

    this.dataPath = dataPath
    this.roles = new Roles({ items : this.#innerState.roles, org : this })
    this.orgStructure = new OrgStructure(`${dataPath}/orgs/org_structure.json`, this.roles)
    this.staff = new Staff({ items : this.#innerState.staff, org : this })
    this.accounts = new Accounts({ items : this.#innerState.auditRecords })
    this.auditRecords = new AuditRecords({ items : this.#innerState.auditRecords })
    this.audits = new Audits({ items : this.#innerState.audits })
    this.technologies = new Technologies({ items : this.#innerState.technologies })
    this.vendors = new Vendors({ items : this.#innerState.vendors })
    this.alerts = {
      sources : new Sources({ items : this.#innerState.alerts.sources })
    }

    this.validate()
    this.staff.validate({ required : true })
  }

  // TODO: some external code relies on access to inner state; remove this once that's fixed; if it's 'read-only', then keep this, but return a structuredClone?
  get innerState() { return this.#innerState }

  // TODO: deprecated; just use 'org.roles'
  getRoles() { return this.roles }

  // TODO: deprecated; just use 'org.staff'
  getStaff() { return this.staff }

  getSetting(key) { return process.env[key] }

  requireSetting(key) {
    const value = this.getSetting(key)
    if (value === undefined) { throw new Error(`No such company setting '${key}'.`) }
    return value
  }

  hasStaffInRole(email, roleName, options) {
    return this.staff.getByRoleName(roleName, options).some(s => s.email === email)
  }

  getManagingRolesByManagedRoleName(roleName) {
    return this.orgStructure.getNodeByRoleName(roleName).getPossibleManagerNodes()
  }

  get id() {
    return this.#innerState.ORG_ID
  }

  get playground() { // TODO: could be static... static gets?
    if (this.#cachedPlayground !== undefined) return this.#cachedPlayground

    const playground = `${process.env.HOME}/.liq/playground`
    const stats = statSync(playground, { throwIfNoEntry : false })
    if (stats === undefined) {
      throw new Error(`Did not find expected playgroudn location at '${playground}'.`)
    }
    else if (!stats.isDirectory()) {
      throw new Error(`Playground '${playground}' is not a directory as expected.`)
    }

    this.#cachedPlayground = playground
    return playground
  }

  get policyRepo() {
    const policyRepo = this.#innerState.settings?.ORG_POLICY_REPO
    if (policyRepo === undefined) {
      throw new Error(`Did not find expected 'settings.ORG_POLICY_REPO' while processing org '${this.ORG_ID}' data.`)
    }

    return policyRepo.startsWith('@') ? policyRepo.slice(1) : policyRepo
  }

  get policyRepoPath() {
    return this.playground + '/' + this.policyRepo
  }

  generateOrgChartData(style = 'debang/OrgChart') {
    // Implementation notes:
    // The overall structure is generated per the 'google-chart' style by processing each role of each titular role of
    // each staff member. At the moment, 'google-chart' style is more of an intermediate step than a final format as it
    // does not support the full range of desired features. The resulting data format is:
    //
    //    [ '<individual email>/role', '<manager email>/role', '<role qualifier>' ]

    if (style === 'google-chart') {
      const result = []
      // luckily, the google org chart doesn't care whether we specify the nodes in order or not, so it's a simple
      // transform
      Object.values(this.staff.list()).forEach(s => {
        s.getOwnRoles().forEach(r => {
          if (r.isTitular() && r.display !== false) {
            const myKey = `${s.email}/${r.getName()}`
            const manager = s.getRole(r.getName()).getManager()
            if (!manager) result.push([myKey, '', r.qualifier])
            else {
              const mngrEmail = manager.email
              const managingRoles = this.getManagingRolesByManagedRoleName(r.getName())
              const managingRole = managingRoles.find(mngrRole =>
                this.hasStaffInRole(mngrEmail, mngrRole.getName(), { ownRolesOnly : true })
              )
                || managingRoles.find(mngrRole =>
                  this.hasStaffInRole(mngrEmail, mngrRole.getName(), { ownRolesOnly : false })
                )

              /* `${mngrEmail}/${r.getName()}` === myKey
                ? r
                : this.getManagingRolesByManagedRoleName(r.getName()).find(mngrRole =>
                    this.hasStaffInRole(mngrEmail, mngrRole.getName())
                  ) */
              if (!managingRole) {
                throw new Error(`Could not find manager ${managingRoles.map(r => `${mngrEmail}/${r.name}`).join('|')} for ${myKey}.`)
              }
              const managerKey = `${mngrEmail}/${managingRole.getName()}`
              result.push([myKey, managerKey, r.qualifier])
            }
          }
        })
      })
      // console.error(result) // DEBUG

      return result
    }
    else if (style === 'debang/OrgChart') {
      // Converts array-based/tabular '[staff, manager, qualifier] to a JSON tree, allowing for the same staff member
      // to appear at multiple nodes using conversion algorithm from debang demos: https://codepen.io/dabeng/pen/mRZpLK
      const seedData = this
        .generateOrgChartData('google-chart')
        .map(row => {
          const [email, roleName] = row[0].split(/\//)
          // if there's a qualifier, we create the 'effective' role name here
          const qualifier = row[2]
          const title = qualifier
            ? roleName.replace(/^((Head|Lead|Senior|Junior) )?/, `$1${qualifier} `)
            : roleName
          const role = this.roles.get(roleName)

          const staffMember = this.staff.get(email)
          const chartDatum = {
            id        : row[0],
            ids       : [row[0]],
            parent_id : row[1], // manager key like "bob@acme.com/CTO"
            email     : email,
            name      : staffMember.getFullName(),
            titles    : [title],
            roles     : [role]
          }
          const staffRole = staffMember.getRole(roleName)
          for (const optField of ['acting', 'tbd']) {
            if (staffRole[optField] !== undefined) { chartDatum[optField] = staffRole[optField] }
          }

          return chartDatum
        })
      const data = {}
      const childNodes = []

      // build out the full tree with each titualar role being it's own thing
      let item
      let countSinceUpdate = 0
      // Builds up data by finding the root (no parent_id) and then adding children until everything is added into the
      // graph.
      while ((item = seedData.shift()) !== undefined) {
        const jsonloop = new JSONLoop(data, 'id', 'children')
        if (!item.parent_id) {
          // jsonloop counts the {} as one
          if (jsonloop.count > 1) throw new Error(`Found multiple roots. data: ${JSON.stringify(data, null, '  ')}; item: ${JSON.stringify(item, null, '  ')}`)
          Object.assign(data, item)
        }
        else {
          if (!('ids' in data)) {
            data.ids = []
          }
          // Search the built up data graph for a matching parent. If found, attach item into data. If not, stick it
          // back on the seedData and process the next item.
          jsonloop.findNodeById(data, item.parent_id, function(err, node) {
            if (err) { // try deferring the processing till the needed node is added...
              countSinceUpdate += 1
              if (countSinceUpdate === seedData.length + 1) {
                throw new Error(`${seedData.length} entries could not be connected to parent (e.g.: ${item.parent_id})\nseed data: ${JSON.stringify(seedData, null, '  ')};\n\ndata: ${JSON.stringify(data, null, '  ')}`, { error : err })
              }
              seedData.push(item)
            }
            else {
              countSinceUpdate = 0
              childNodes.push(item)
              if ('children' in node) {
                node.children.push(item)
              }
              else {
                node.children = [item]
              }
            }
          })
        }
      }

      const mergeNodes = (target, source) => {
        target.titles.push(...source.titles)
        target.ids.push(...source.ids)
        target.roles.push(...source.roles)
      }

      // collapse/merge nodes where appropriate
      childNodes.forEach(node => {
        const jsonloop = new JSONLoop(data, 'id', 'children')
        jsonloop.findParent(data, node, (err, parent) => {
          if (err) throw new Error(`Could not find parent for '${node.id}'; is chart valid?`)

          if (parent) {
            // merge sideways
            for (const role of node.roles) {
              /* OK, wanted to do:
              const sibblingsRoleNamesToMerge = role.implies?.filter(impSpec =>
                  impSpec.mngrProtocol === 'same' && node.ids.indexOf(`${node.email}/${impSpec.mergeWith}`) >= 0 )
                .map(i => i.name)

              But eslint chokes... on the question mark? It's not clear. It talks about an undefined range.
              Tried updating eslint and babel components 2021-03-28 with no success.
              TODO: look into this and report bug if nothing found.
              */
              const sibblingsRoleNamesToMerge =
                role.implies && role.implies.filter(impSpec =>
                  impSpec.display !== false
                  && impSpec.mngrProtocol === 'same'
                    && node.ids.indexOf(`${node.email}/${impSpec.mergeWith}`) >= 0)
                  .map(i => i.name)

              // const trimRoles = (n) => { const { roles, ...rest } = n; return rest; } // DEBUG

              /* if (sibblingsRoleNamesToMerge) {// DEBUG
                console.error(`Side merging to ${node.titles[0]}\n`, sibblingsRoleNamesToMerge)
              } */
              for (const mergeMeName of sibblingsRoleNamesToMerge || []) {
                const key = `${node.email}/${mergeMeName}`
                // console.error(`Looking for '${key}' to merge in: `, parent.children.map(trimRoles))// DEBUG
                const mergeMeNode = parent.children.find(c => c.ids.find(id => id === key))
                if (mergeMeNode) {
                  // console.error('Found: ', trimRoles(mergeMeNode)) // DEBUG
                  mergeNodes(node, mergeMeNode)
                  parent.children.splice(parent.children.findIndex((t) => t === mergeMeNode), 1)
                }
              }
            }

            // merge up
            if (node.email === parent.email) {
              // It may be the case that we have a node with multiple roles and a sub-role has reports. The sub-node
              // will be rendered in order to clarify the nature of the reports, but we hide the email which is
              // appearent in the parent node.
              node.hideName = true

              // collapse staff member roles to same staff in parent role if only child or sub-node has no children.
              if (parent.children.length === 1 || node.children === undefined) {
                mergeNodes(parent, node)
                // If 'node' is only child collapsing into parrent, just cut it out
                if (parent.children.length === 1) parent.children = node.children
                else { // Else, just cut the child out
                  parent.children.splice(parent.children.findIndex((t) => t === node), 1)
                }
              }
            }
          }
        })
      })

      return data
    }
    else throw new Error(`Org chart style '${style}' is not supported.`)
  }
}

export { Organization }
