import { Item } from '../lib/Item'

const Role = class extends Item {
  constructor(rec, options) {
    super(rec, options)
  }

  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }
}

export { Role }
