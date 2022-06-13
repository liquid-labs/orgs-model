import { Item, bindCreationConfig } from '../lib/Item'

const impliesCache = {}
const nameMapper = (i) => i.name

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

  getManagerRoles({ namesOnly = false } = {}) {
    const org = this.#org

    const mapper = namesOnly === true
      ? nameMapper
      : (i) => org.roles.get(i.name)

    const orgChartNode = this.#org.orgStructure.getNodeByRoleName(this.name)
    const managers = [...orgChartNode.getPossibleManagerNodes()]
      .filter((i) => i !== undefined)
      .map(mapper)

    return managers
  }

  getReportRoles({ namesOnly = false } = {}) {
    const org = this.#org

    const orgChartNode = this.#org.orgStructure.getNodeByRoleName(this.name)
    const reportNames = orgChartNode.getReportRoleNames()

    return namesOnly === true
      ? reportNames
      : reportNames.map((i) => org.roles.get(i))
  }

  // TODO: once we've got plugins done, this logic should move to 'liq-roles'
  getAccess() {
    const allAccess = {}
    for (const { role : accessRole, access } of this.#org.innerState.rolesAccess.accessRules) {
      if (access === undefined || access.length === 0) continue

      if (this.impliesRole(accessRole)) {
        for (const { serviceBundle, type } of access) {
          const currTypes = allAccess[serviceBundle]
          if (currTypes === undefined) {
            allAccess[serviceBundle] = [type]
          }
          else {
            allAccess[serviceBundle] = combineAccess({ type, currTypes })
          }
        }
      }
    }

    return allAccess
  }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }

  get allDuties() {
    if (this.#allDuties !== undefined) {
      return this.#allDuties
    }
    // else figure out all duties
    this.#allDuties = {}
    const frontier = [this.data]
    while (frontier.length > 0) {
      const edge = frontier.shift()
      if (edge.duties) {
        mergeDuties(this.#allDuties, edge.duties)
      }
      const { superRole, implies = [] } = edge
      if (superRole) {
        frontier.push(this.#org.roles.get(superRole, { required : true, rawData : true }))
      }
      for (const { name } of implies) {
        frontier.push(this.#org.roles.get(name, { required : true, rawData : true }))
      }
    }
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

const combineAccess = ({ currTypes, type }) => {
  // first we check if the incoming type is duplicative of or is supersceded by an existing type
  if (currTypes.includes(type)) {
    return currTypes
  }
  else if (type === 'reader'
      && (currTypes.includes('editor') || currTypes.includes('manager') || currTypes.includes('admin'))) {
    return currTypes
  }
  else if (type === 'editor' && (currTypes.includes('manager') || currTypes.includes('admin'))) {
    return currTypes
  }
  else if (type === 'manager' && currTypes.includes('admin')) {
    return currTypes
  }
  // new we check if the incoming type superscedes an existing type
  else if ((type === 'editor' || type === 'manager' || type === 'admin')) {
    const readerI = currTypes.indexOf('reader')
    if (readerI >= 0) {
      currTypes.splice(readerI, 1, type)
    }
    else if ((type === 'manager' || type === 'admin')) {
      const editorI = currTypes.indexOf('editor')
      if (editorI >= 0) {
        currTypes.splice(editorI, 1, type)
      }
      else if (type === 'admin') {
        const managerI = currTypes.indexOf('manager')
        if (managerI >= 0) {
          currTypes.splice(managerI, 1, type)
        }
      }
    }
  }
  else { // we add the incoming type to the list; should really only happen with 'access-manager' + one non-admin type
    currTypes.push(type)
  }
  currTypes.sort((a, b) => {
    if (a === b) return 0
    if (a === 'reader') return -1
    if (b === 'reader') return 1
    if (a === 'access-manager' || a === 'admin') return 1
    if (b === 'access-manager' || b === 'admin') return -1
    if (a === 'manager') return -1
    if (b === 'manager') return 1
    // then the only thing left is editor, but since they are not both editor, then one of the previous checks must have
    // already passed; but lint wants us to return something...
    return 0
  })
  return currTypes
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
