import { Item, bindCreationConfig } from '../lib/Item'

const impliesCache = {}

const Role = class extends Item {
  #allDuties
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
  
  get allDuties() {
    if (this.#allDuties !== undefined) {
      return this.#allDuties
    }
    // else figure out all duties
    this.#allDuties = {}
    const tracker = {}
    const frontier = [ this.data ]
    // console.log(`starting frontier: `, frontier) // DEBUG
    while (frontier.length > 0) {
      const edge = frontier.shift()
      if (edge.duties) {
        // console.log(`      allDuties pre-merge:`, this.#allDuties, '\n      edge duties: ', edge.duties) // DEBUG
        mergeDuties(this.#allDuties, edge.duties)
        // console.log(`      allDuties post-merge:`, this.#allDuties) // DEBUG
      }
      const { superRole, implies=[] } = edge
      if (superRole) {
        // console.log(`  expanding frontier with superRole ${superRole}`) // DEBUG
        frontier.push(this.#org.roles.get(superRole, { required: true, rawData: true }))
      }
      for (const { name } of implies) {
        // console.log(`  expanding frontier with implied role ${name}`) // DEBUG
        frontier.push(this.#org.roles.get(name, { required: true, rawData: true }))
      }
    }
    // console.log(`${this.name} allDuties: `, this.#allDuties)
    return this.#allDuties
  }

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

const mergeDuties = (target, source) => {
  const sourceKeys = Object.keys(source)
  for (const sourceKey of sourceKeys) {
    if (sourceKey in target) {
      const targetDomainDuties = target[sourceKey]
      const sourceDomainDuties = source[sourceKey]
      for (const duty of sourceDomainDuties) {
        if (!targetDomainDuties.includes(duty)) {
          targetDomainDuties.push(duty)
        }
      }
    }
    else {
      target[sourceKey] = [...source[sourceKey]]
    }
  }
  
  return target
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
