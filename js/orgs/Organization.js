import { OrgStructure } from './OrgStructure'
import { JSONLoop } from './lib/JSONLoop'

import { RolesTsv } from '../roles'
import { Staff, StaffTsv } from '../staff'

const Organization = class {
  constructor(rolesTsvPath, staffTsvPath, orgStructurePath) {
    this.roles = new RolesTsv(rolesTsvPath).hydrate()
    this.orgStructure = new OrgStructure(orgStructurePath, this.roles)
    this.staff = new StaffTsv(staffTsvPath).init(this)
    Staff.hydrate(this)
  }

  getRole(name) { return this.roles[name] }

  getStaffMember(email) { return this.staff[email] }

  getStaffByRoleName(roleName) { return Object.values(this.staff).filter(s => s.hasRole(roleName)) }

  getManagingRoleByManagedRoleName(roleName) {
    return this.orgStructure.getNodeByRoleName(roleName).getParent()
  }

  generateOrgChartData(style='debang/OrgChart') {
    if (style === 'google-chart') {
      const result = []
      // luckily, the google org chart doesn't care whether we specify the nodes in order or not, so it's a simple
      // transform
      Object.values(this.staff).forEach(s => {
        s.getAttachedRoles().forEach(r => {
          const myKey = `${s.getEmail()}/${r.getName()}`
          const manager = s.getManagerByRoleName(r.getName())
          const managerKey = (manager
            ? `${manager.getEmail()}/${this.getManagingRoleByManagedRoleName(r.getName()).getName()}`
            : '')
          result.push([myKey, managerKey])
        })
      })

      return result
    }
    else if (style === 'debang/OrgChart') {
      // Converts flat/tabular (Staff, Manager) to a JSON tree, allowing for the same staff member to appear at multiple
      // notes using conversion algorithm from debang demos: https://codepen.io/dabeng/pen/mRZpLK
      const seedData = this.generateOrgChartData('google-chart').map(row => {
        const [ email, roleName ] = row[0].split(/\//)
        const staffMember = this.getStaffMember(email)
        return { id: row[0], parent_id: row[1], email: email, name: staffMember.getFullName(), titles: [roleName] }
      })
      var data = {}
      var childNodes = []

      seedData.forEach((item, index) => {
        if (!item.parent_id) {
          delete item.parent_id
          Object.assign(data, item)
        }
        else {
          var jsonloop = new JSONLoop(data, 'id', 'children')
          jsonloop.findNodeById(data, item.parent_id, function(err, node) {
            if (err) throw new Error(err)
            else {
              delete item.parent_id
              childNodes.push(item)
              if (node.children) {
                node.children.push(item)
                var b = 2;
              }
              else {
                node.children = [ item ]
                var a = 1
              }
            }
          })
        }
      })

      // now, collapse staff member roles to same staff in parent role if only child
      childNodes.forEach(node => {
        const jsonloop = new JSONLoop(data, 'id', 'children')
        jsonloop.findParent(data, node, (err, parent) => {
          if (err) throw new Error(`Could not find parent for '${node.id}'; is chart valid?`)
          if (parent && node.email === parent.email && parent.children.length === 1) {
            parent.titles.push(...node.titles)
            parent.children = node.children
          }
        })
      })

      return data
    }
    else throw new Error(`Org chart style '${style}' is not supported.`)
  }
}

export { Organization }