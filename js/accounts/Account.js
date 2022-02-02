import * as idxType from '../lib/index-relationships.js'
import { Item } from '../lib/Item'

const Account = class extends Item {
  constructor(data, options) {
    super(data, Object.assign(options, {
      keyField: 'directEmail',
      indexes : [ { indexField : 'department', relationship : idxType.ONE_TO_MANY } ],
    }))
  }
}

export { Account }
