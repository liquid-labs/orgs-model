import { Item, bindCreationConfig } from '../lib/Item'

const Role = class extends Item {
  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }
}

bindCreationConfig({
  dataCleaner   : (data) => { delete data.id; return data },
  dataFlattener : (data) => {
    const { implies, aliases, duties, matcher } = data
    if (data.implies)
      data.implies = `${implies.name};${implies.mngrProtocol}`
    if (data.aliases)
      data.aliases = aliases.join('; ')
    if (data.description)
      data.description = data.description.link
    if (data.duties)
      data.duties = duties.map((d) => d.description).join('; ')
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
