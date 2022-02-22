import structuredClone from 'core-js-pure/actual/structured-clone'

/**
* An extensible Proxy object which allows Proxys to play nice with classes. This opens up a world of possibilities that
* are compatible with classes. I.e., it is no longer necessary to create proxies for objects as a separate step:
* ```
* // the old way
* const Foo = class { ... }
* const foo = new Foo()
* const fooProxy = new Proxy(foo)
* // with Item
* const Bar = class extends Item { ... }
* const bar = new Bar() // and you're done! Bar is a proxy which also behaves (mostly) like a regular class.
* ```
*
* By default, Item ensures that incoming and outgoing data is safely copied. E.g.:
* ```
* const Foo = class extends Item { field }
* const data = { a: 1 }
* const foo = new Foo()
* foo.a = data
* data.a = 2
* console.log(`${data.a} - ${foo.a}`) // prints: '2 - 1'
* ```
*
* ## Implementation notes
*
* - If we just wrap and return the 'this' in the Item constructor, it will not find any sub-class functions. It would be
*   good to understand exactly why that is
*
* ## Next steps
*
* - Support configuration allowing support for non-copied incoming and/or outgoing data on a field by field basis.
* - Support configuration allowing custom transformation of incoming and/or outgoing data on a field by field basis.
*
* ## Known issues
*
* - `object.bar = new Function(...)` may mean "remember this function", but is treated as "callable function"; need to
*   implement configuration to avoid. The current workaround is to define a getter and/or setter for such a field, which
*   will force it to be treated like a field property rather than a function property.
*
* ## Credits
*
* The inspiration for this implementation came from [this post](https://stackoverflow.com/a/40714458/929494) by
* [John L.](https://stackoverflow.com/users/2437716/john-l). I'm blown away this technique isn't more widely cited.
*/

// TODO: more robust to build from 'Object.prototype'?
const SKIP_METHODS = ['constructor', '__defineGetter__', '__defineSetter__', 'hasOwnProperty', '__lookupGetter__', '__lookupSetter__', '__proto__', 'isPrototypeOf']

const indexAllProperties = (obj) => {
  const propIndex = {}
  const methodIndex = {}

  while (obj/* && obj !== Object.prototype <- any use for hiding? */) {
    const propDescriptors = Object.getOwnPropertyDescriptors(obj)
    // eslint-disable-next-line guard-for-in
    for (const propKey in propDescriptors) {
      const descriptor = propDescriptors[propKey]
      const propValue = descriptor.value
      const isFunction = !!(propValue && (typeof propValue === 'function'))
      const hasGetter = !!descriptor.get
      const hasSetter = !!descriptor.set
      const isField = hasGetter || hasSetter
      // probably not necessary, but to keep from confusion we don't override the Proxy functions
      if (!isField && propValue && obj !== Object && isFunction && !SKIP_METHODS.includes(propKey)) {
        methodIndex[propKey] = descriptor/* {
          func: propValue,
          descriptor:
        } */
      }
      else if (isField) {
        propIndex[propKey] = {
          hasGetter : !!descriptor.get,
          hasSetter : !!descriptor.set
        }
      }
    }
    obj = Object.getPrototypeOf(obj)
  }

  return [propIndex, methodIndex]
}

const handler = ({ data, propIndex, methodIndex }) => ({
  get : (object, key) => {
    if (key === 'isProxy') return true
    // the 'if (key in object)' syntax is nice... but how to distinguish between getters and setters?
    if (propIndex[key]?.hasGetter === true) return object[key]
    // object method calls go through the handler first
    if (methodIndex[key]) return object[key]
    const localValue = object[key]
    // else
    const dataValue = data[key]
    const value = localValue || dataValue // TODO: try switch
    return value && typeof value === 'object'
      ? structuredClone(value)
      : value
  },
  set : (object, key, value) => {
    if (propIndex[key]?.hasSetter === true) {
      object[key] = value && (typeof value === 'object')
        ? object[key] = structuredClone(value)
        : object[key] = value
    }
    if (methodIndex[key]) {
      object[key] = value
    }
    throw new Error(`Setting '${key}' is not supported.`)
  },
  ownKeys : (target) => {
    return Reflect.ownKeys(target).concat(Reflect.ownKeys(data))
  },
  has : (target, key) => {
    return (key in target) || (key in data)
  },
  getOwnPropertyDescriptor : (target, key) => {
    return Object.getOwnPropertyDescriptor(target, key)
      // TODO: modify the prop definitions so that the 'data' items are indeed non-configurable
      || Object.assign(Object.getOwnPropertyDescriptor(data, key), { writable : false, configurable : true })
  }
})

const defaultNormalizer = (id) => id

const Item = class {
  #data
  #keyField

  constructor(data, { idNormalizer = defaultNormalizer, itemName, keyField, ...rest } = {}) {
    if (keyField === undefined) {
      throw new Error('Key field must be specified. '
        + "Note, 'Item' is not typically created directly. Create a subclass or specify 'options.keyField' directly.")
    }
    this.#data = data
    this.#keyField = keyField

    if (!data[keyField]) {
      throw new Error(`Key field '${keyField}' value '${data[keyField]}' is non-truthy!`)
    }
    // The 'id' is normally set at the resource level which gives us a chance to do a quick duplicate check. However,
    // if an item is created through some other route, let's support setting an explicit ID
    if (!data.id) {
      data.id = idNormalizer(data[keyField])
    }
    else if (data.id !== idNormalizer(data[keyField])) {
      throw new Error(`Error creating${itemName === undefined ? '' : ` '${itemName}'`} item; 'id' (${data.id}) and${idNormalizer === defaultNormalizer ? '' : ' normalized'} key field (${idNormalizer === defaultNormalizer ? '' : 'raw: '}${data[keyField]}) do not match.`)
    }

    const [propIndex, methodIndex] = indexAllProperties(this)
    const proxy = new Proxy(this, handler({ data : this.#data, propIndex, methodIndex }))

    return proxy
  }

  get id() { return this.#data.id }

  get data() { return structuredClone(this.#data) }

  get rawData() { return this.#data }
}

export { Item }
