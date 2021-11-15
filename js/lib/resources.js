/**
* Common class for base resources support simple get and list functions.
*/
const Resources = class {
  constructor({ items, key }) {
    this.items = items || []
    this.items.forEach((item) => { item.id = item.id || item[key] })
    this.key = key

    this.index = this.items.reduce((index, item) => { index[item[key]] = item; return index }, {})
  }

  add(item) {
    if (this.index[item.id] !== undefined) {
      throw new Error(`Cannot add item with existing key '${item.id}'.`)
    }

    this.items.push(item)
    this.index[item.id] = item
  }

  /**
  * Retrieves a single vendor/product entry by name.
  */
  get(name, { required = false } = {}) {
    const result = this.index[name]
    if (required === true && result === undefined) {
      throw new Error(`Did not find required vendor '${name}'.`)
    }

    return result
  }

  key() { return this.key }

  list({ sort = this.key } = {}) {
    return sort
      ? this.items.sort((a, b) => a[sort].localeCompare(b[sort])) // TODO: check if sort field is valid
      : this.items
  }
}

const commonAPIInstanceSetup = ({ self, org, checkCondition }) => {
  self.org = org
  self.hydrationErrors = [] // list of: { ref: ..., sourceName: ..., sourceType: ..., advice?: ...}
  // e.g.: { ref: "bad-audit-name", sourceName: "Acme Vendor", "sourceType": "vendor" }
  self.checkCondition = checkCondition
}

export { commonAPIInstanceSetup, Resources }
