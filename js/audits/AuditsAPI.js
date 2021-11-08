const AuditsAPI = class {
  constructor(org) {
    this.org = org
    
    this.items = org.innerState.audits
    this.index = this.items.reduce((index, entry) => { index[entry.name] = entry; return index }, {})
  }
  
  list() { return this.items.slice() }
  
  get(name, { required = false } = {}) {
    const result = this.index[name]
    if (required === true && result === undefined) {
      throw new Error(`Did not find required audit '${name}'.`)
    }
    
    return result
  }
}

export { AuditsAPI }
