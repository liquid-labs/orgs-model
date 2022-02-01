import structuredClone from 'core-js-pure/actual/structured-clone'

/**
* ## Credits
*
* The inspiration for this implementation came from [this post](https://stackoverflow.com/a/40714458/929494) by
* [John L.](https://stackoverflow.com/users/2437716/john-l). I'm blown away this technique isn't more widely cited.
*/

const indexAllProperties = (obj, index = {}) => {
  while (obj/* && obj !== Object.prototype <- any use for hiding? */) {
    const propDescriptors = Object.getOwnPropertyDescriptors(obj)
    // eslint-disable-next-line guard-for-in
    for (const propKey in propDescriptors) {
      index[propKey] = {
        hasGetter : !!propDescriptors[propKey].get,
        hasSetter : !!propDescriptors[propKey].set
      }
    }
    obj = Object.getPrototypeOf(obj)
  }

  return index
}

const handler = (data, overrides) => ({
  get : (object, key) => {
    // the 'if (key in object)' syntax is nice... but how to distinguish between getters and setters?
    if (overrides[key]?.hasGetter === true) return object[key]
    // else
    const value = data[key]
    return value && typeof value === 'object'
      ? structuredClone(value)
      : value
  },
  set : (object, key, value) => {
    if (overrides[key]?.hasSetter === true) { object[key] = value }
    // else
    throw new Error(`Setting '${key}' is not supported.`)
  }
})

const Item = class {
  #data
  #keyField

  constructor(data, { keyField, ...rest } = {}) {
    if (keyField === undefined) {
      throw new Error('Key field must be specified. '
        + "Note, 'Item' is not typically created directly. Create a subclass or specify 'options.keyField' directly.")
    }
    this.#data = data
    this.#keyField = keyField

    if (!data[keyField]) throw new Error(`Key field value '${data[keyField]}' is non-truthy!`)

    const overrides = indexAllProperties(this)

    return new Proxy(this, handler(this.#data, overrides))
  }

  get id() { return this.#data[this.#keyField] }

  get data() { return structuredClone(this.#data) }

  get rawData() { return this.#data }
}

export { Item }
