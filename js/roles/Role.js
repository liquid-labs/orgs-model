import { Item, bindCreationConfig } from '../lib/Item'

const impliesCache = {}

const Role = class extends Item {
  #org

  constructor(data, { org, ...rest }) {
    super(data, rest)

    if (org === undefined) {
      throw new Error('\'org\' is a required parameter when creating a new Role.')
    }
    this.#org = org
  }

  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }

  impliesRole(roleName) {
    if (roleName === this.name) {
      return true
    }

    const myName = this.name
    if (!(myName in impliesCache)) {
      impliesCache[myName] = {}
    }
    const myCache = impliesCache[myName]
    const cachedResponse = myCache[roleName]
    if (cachedResponse !== undefined) {
      return cachedResponse
    }
    // else, we gotta figure it out
    const toCheck = (this.implies && this.implies.map(r => r.name)) || []
    // console.log('toCheck (1): ', toCheck) // DEBUG
    if (this.superRole) {
      toCheck.push(this.superRole)
    }

    // console.log('toCheck(2): ', toCheck) // DEBUG
    for (const impliedRoleName of toCheck) {
      if (impliedRoleName === roleName) {
        myCache[roleName] = true
        return true
      }
      const impliedRole = this.#org.roles.get(impliedRoleName)
      if (!impliedRole) {
        throw new Error(`Did not find implied role '${impliedRole}' while processing implications for '${roleName}'`)
      }
      if (impliedRole.impliesRole(roleName)) {
        myCache[roleName] = true
        return true
      }
    }

    myCache[roleName] = false
    return false
  }
}

bindCreationConfig({
  dataCleaner   : (data) => { delete data.id; return data },
  dataFlattener : (data) => {
    const { implies, aliases, duties, matcher } = data
    if (data.implies) { data.implies = `${implies.name};${implies.mngrProtocol}` }
    if (data.aliases) { data.aliases = aliases.join('; ') }
    if (data.description) { data.description = data.description.link }
    if (data.duties) { data.duties = duties.map((d) => d.description).join('; ') }
    if (data.matcher) {
      const { pattern, antiPattern, qualifierGroup } = matcher
      data.matcher = `/${pattern}/`
        + `${antiPattern ? ` except /${antiPattern}/` : ''}`
        + `${qualifierGroup ? ` (${qualifierGroup})` : ''}`
    }
    return data
  },
  itemClass    : Role,
  itemName     : 'role',
  keyField     : 'name',
  resourceName : 'roles'
})

export { Role }
