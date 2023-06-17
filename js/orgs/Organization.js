import { writeFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import * as fjson from '@liquid-labs/federated-json'
import { Model } from '@liquid-labs/resource-model'

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

const SETTINGS_KEY = 'settings' // to avoid basic mis-typing errors
const ORG_ID = 'ORG_ID'
const ORG_POLICY_DATA_REPO = 'ORG_POLICY_DATA_REPO'
const ORG_POLICY_REPO = 'ORG_POLICY_REPO'

const Organization = class extends Model {
  #rootDataPath
  #components = []
  #settings

  constructor({ dataPath, ...fjsonOptions } = {}) {
    super({ validators : [settingsValidator] })

    this.#rootDataPath = `${dataPath}/orgs/org.json`
    this.dataPath = dataPath

    const rolesPath = process.env.LIQ_ROLES_PATH || fsPath.join(dataPath, 'orgs', 'roles', 'roles.json')
    const roles = new Roles({ allowNoFile: true, fileName: rolesPath, org : this, readFromFile: true })
    this.bindRootItemManager(roles)

    const staffPath = process.env.LIQ_STAFF_PATH || fsPath.join(dataPath, 'orgs', 'staff.json')
    const staff = new Staff({ allowNoFile: true, fileName: staffPath, org : this, readFromFile: true })
    this.bindRootItemManager(staff)

    const accountsPath = process.env.LIQ_ACCOUNTS_PATH || fsPath.join(dataPath, 'orgs', 'third-party-accounts.json')
    const accounts = new Accounts({ allowNoFile: true, fileName: accountsPath, readFromFile: true })
    this.bindRootItemManager(accounts)

    const auditRecordsPath = process.env.LIQ_AUDIT_RECORDS_PATH 
      || fsPath.join(dataPath, 'orgs', 'audits', 'audit-records.json')
    const auditRecords = new AuditRecords({ allowNoFile: true, fileName: auditRecordsPath, readFromFile: true })
    this.bindRootItemManager(auditRecords)

    const auditsPath = process.env.LIQ_AUDITS_PATH || fsPath.join(dataPath, 'orgs', 'audits', 'audits.json')
    const audits = new Audits({ allowNoFile: true, fileName: auditsPath, readFromFile: true })
    this.bindRootItemManager(audits)

    const technologiesPath = process.env.LIQ_TECHNOLOGIES_PATH || fsPath.join(dataPath, 'orgs', 'technologies.json')
    const technologies = new Technologies({ allowNoFile: true, fileName: technologiesPath, readFromFile: true })
    this.bindRootItemManager(technologies)

    const vendorsPath = process.env.LIQ_VENDORS_PATH || fsPath.join(dataPath, 'orgs', 'vendors.json')
    const vendors = new Vendors({ allowNoFile: true, fileName: vendorsPath, readFromFile: true })
    this.bindRootItemManager(vendors)

    const alerts = new Model()
    this.bindSubModel('alerts', alerts)

    const sourcesPath = process.env.LIQ_ALERT_SOURCES_PATH || fsPath.join(dataPath, 'orgs', 'alerts', 'sources.json')
    const sources = new Sources({ allowNoFile: true, fileName: sourcesPath, readFromFile: true })
    alerts.bindRootItemManager(sources)

    this.#loadNonItems()
  }

  load(args) {
    super.load(args)

    this.#loadNonItems()
  }

  #loadNonItems() {
    this.orgStructure = new OrgStructure(fsPath.join(this.dataPath, 'orgs', 'org_structure.json'), this.roles)
    const settingsPath = fsPath.join(this.dataPath, 'orgs', 'settings.yaml')
    this.#settings = readFJSON(settingsPath)
  }

  static initializeOrganization({ commonName, dataPath, legalName, orgKey }) {
    const orgData = {
      auditRecords       : './audits/auditRecords.yaml',
      roles              : './roles/roles.yaml',
      rolesAccess        : './roles/access.yaml',
      roleDuties         : './roles/duties.yaml',
      rolePolicies       : './roles/role-policies.yaml',
      staff              : './staff.yaml',
      technologies       : './technologies.yaml',
      thirdPartyAccounts : './third-party-accounts.yaml',
      vendors            : './vendors.yaml',
      settings           : './settings.yaml'
    }
    for (const [key, file] of Object.entries(orgData)) {
      fjson.addMountPoint({ data : orgData, path : '.' + key, file })
      orgData[key] = []
    }
    orgData.commonName = commonName
    orgData.alerts = {
      sources : [],
      reviews : []
    }
    orgData.audits = []

    const settings = {
      ORG_ID          : orgKey,
      ORG_COMMON_NAME : commonName,
      ORG_LEGAL_NAME  : legalName,
      s               : {
        KEY         : orgKey,
        COMMON_NAME : commonName,
        LEGAL_NAME  : legalName
      }
    }
    orgData.settings = settings

    const rootFile = dataPath + '/orgs/org.json'
    const orgStructurePath = dataPath + '/orgs/org_structure.json'

    fjson.write({ data : orgData, file : rootFile })
    // TODO: this should be part of the federated structure (need to support YAML)
    writeFileSync(orgStructurePath, '[]')

    return new Organization({ dataPath })
  }

  get key() { return this.getSetting('KEY') }

  get commonName() { return this.getSetting('COMMON_NAME') }

  get legalName() { return this.getSetting('LEGAL_NAME') }

  get settings() {
    const settingsCopy = structuredClone(this.#settings)
    delete settingsCopy._meta
    return settingsCopy
  }

  getSetting(keyPath) {
    if (keyPath.startsWith('.')) keyPath = keyPath.slice(1)

    // check for process override
    let value = process.env[keyPath]
    if (value !== undefined) return structuredClone(value)
    // else, follow the path

    value = this.#settings
    let pathBits = keyPath?.split('.') || []

    for (const key of pathBits) {
      value = value?.[key]
    }
    if (value !== undefined) return structuredClone(value)
    // else look for special case '.s'
    // TODO: is this necessary anymore?
    value = this.#settings.s
    pathBits = keyPath?.split('.') || []
    // TODO: This oddness with the 's' was for backward compatibility while moving items off root. I think it makes more sense to always require scoping and put the core items under the 'core' scope
    if (pathBits[0] === 's') pathBits = pathBits.slice(1)
    for (const key of pathBits) {
      value = value?.[key]
    }

    return structuredClone(value)
  }

  updateSetting(keyPath, value) {
    if (keyPath.startsWith('.')) keyPath = keyPath.slice(1)

    return keyPath.split('.').reduce((workingData, key, i, arr) => {
      if ((i + 1) === arr.length) {
        workingData[key] = value
        return value
      }
      else {
        if (!(key in workingData)) {
          workingData[key] = {}
        }
        return workingData[key]
      }
    }, this.#settings)
  }

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
    return this.#settings[ORG_ID]
  }

  get policyDataRepo() {
    const policyRepo = this.#settings[ORG_POLICY_DATA_REPO] // this is validated (exists) value
    return policyRepo?.startsWith('@') ? policyRepo.slice(1) : policyRepo
  }

  get policyRepo() {
    const policyRepo = this.#settings[ORG_POLICY_REPO] // this is a validated (exists) value
    return policyRepo?.startsWith('@') ? policyRepo.slice(1) : policyRepo
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
            email,
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

              for (const mergeMeName of sibblingsRoleNamesToMerge || []) {
                const key = `${node.email}/${mergeMeName}`
                const mergeMeNode = parent.children.find(c => c.ids.find(id => id === key))
                if (mergeMeNode) {
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

const settingsValidator = {
  validate : ({ model: org, errors, warnings }) => {
    if (org.getSetting(ORG_ID) === undefined) {
      errors.push('Did not find expected <code>ORG_ID<rst> setting.')
    }
  }
}

export { Organization }
