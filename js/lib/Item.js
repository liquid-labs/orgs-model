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
* The basic Proxy technique came from [this post](https://stackoverflow.com/a/40714458/929494) by
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
        propIndex[propKey] = Object.assign({
          hasGetter : !!descriptor.get,
          hasSetter : !!descriptor.set
        }, descriptor)
      }
    }
    obj = Object.getPrototypeOf(obj)
  }

  return [propIndex, methodIndex]
}

const handler = ({ allowSet, data, propIndex, methodIndex }) => ({
  get : (object, key, reciever) => {
    if (key === 'isProxy') return true
    // object method calls can go through the handler first
    // TODO: the 'private' thing is a workaround for a Babel bug (?) that messes up private calls
    else if (methodIndex[key] || propIndex[key] || key.match(/private/)) {
      return object[key]
    }
    else {
      const value = data[key]
      return value && typeof value === 'object'
        ? structuredClone(value)
        : value
    }
  },
  set : (object, key, value) => {
    // propIndex of object (not data) are allowed to be set
    if (propIndex[key] || key.match(/private/)) {
      object[key] = value
      return true
    }
    else if (allowSet && allowSet.indexOf(key) !== -1) {
      const setValue = value && typeof value === 'object'
        ? structuredClone(value)
        : value
      data[key] = setValue
      return true
    }
    /* TODO: suppport 'setXXX' style?
    else if (methodIndex[`set${key.ucfirst()`]) {
      object[key] = value
    } */
    else throw new Error(`Setting '${key}' is not supported.`)
  },
  ownKeys : (target) => {
    return Reflect.ownKeys(target).concat(Reflect.ownKeys(data))
  },
  has : (target, key) => {
    return (key in target) || (key in data)
  },
  getOwnPropertyDescriptor : (target, key) => {
    // TODO: really, theh property as percieved by the user is not configurable; but if we set that false, the proxy complains that it doesn't match the underlying data property...
    return Object.getOwnPropertyDescriptor(target, key)
      || Object.assign(Object.getOwnPropertyDescriptor(data, key), { writable : false, configurable : true })
  }
})

const defaultIdNormalizer = (id) => typeof id === 'string' ? id.toLowerCase() : id

const Item = class {
  #data
  #idNormalizer
  #keyField
  #hasExplicitId

  constructor(data, { idNormalizer = defaultIdNormalizer, allowSet, itemName, keyField, ...rest } = {}) {
    if (keyField === undefined) {
      throw new Error('Key field must be specified. '
        + "Note, 'Item' is not typically created directly. Create a subclass or specify 'options.keyField' directly.")
    }
    this.#data = data
    this.#idNormalizer = idNormalizer
    this.#keyField = keyField

    if (!data[keyField]) {
      throw new Error(`Key field '${keyField}' value '${data[keyField]}' is non-truthy!`)
    }

    if ('id' in data) this.#hasExplicitId = true
    else {
      data.id = idNormalizer(data[keyField])
      this.#hasExplicitId = false
    }

    const [propIndex, methodIndex] = indexAllProperties(this)
    const proxy = new Proxy(this, handler({
      data : this.#data,
      propIndex,
      methodIndex
    }))

    return proxy // Note, this overrides the default + implicit 'return this'
  } // end constructor

  // get id() { return this.#data.id || this.#idNormalizer(this.#data[this.#keyField]) }

  get data() { return structuredClone(this.#data) }

  // TODO: drop this
  get rawData() { return this.#data }
}

/**
* Creates a frozen resource 'creationOptions' and immutably binds it to the resource class.
*
* #### Parameters
*
* - `itemClass`: The class used to create new resource items. This is also where the class `creationOptions' is bound.
* - `itemName`: The name by which to refer resource items.
* - `keyField`: The key field used as or to generate an ID.
* - `resourceName`: The name by which to refer to the resource as a wole and multiple resource items.
* - `idNormalizer`: (opt) A function used to normalize the key field when creating implied IDs. Will default to the
*     `defaultIdNormalizer` if not specified.
*/
const bindCreationConfig = ({ itemClass, itemName, keyField, resourceName, idNormalizer }) => {
  // create basic, minimal options
  const creationOptions = { itemClass, itemName, keyField, resourceName }
  // add optional configurations
  if (idNormalizer) creationOptions.idNormalizer = idNormalizer
  // lock it down
  Object.freeze(creationOptions)
  // bind it
  Object.defineProperty(itemClass, 'creationOptions', {
    value        : creationOptions,
    writable     : false,
    enumerable   : true,
    configurable : false
  })

  return creationOptions
}

export { Item, defaultIdNormalizer, bindCreationConfig }
