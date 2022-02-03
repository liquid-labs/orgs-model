import { Item } from '../lib/Item'

const Role = class extends Item {
  constructor(rec) {
    super(rec, { keyField : 'name' })
  }

  getName() { return this.name }

  getManager() { return this.manager }

  isTitular() { return !!this.titular }

  isDesignated() { return !!this.designated }

  isQualifiable() { return !!this.qualifiable }
}

export { Role }
