// JSONLoop is a trivial rework of https://github.com/dabeng/JSON-Loop cc9bf8d3ec9d366160

let nodes = [] // used as temp workpad

const JSONLoop = class {
  constructor(obj, idPropertyName, childrenPropertyName) {
    this.id = idPropertyName
    this.children = childrenPropertyName
    this.count = 0
    this.countNodes(obj)
    this.total = this.count + 0
  }

  isEmpty(obj) {
    return Object.keys(obj).length === 0
  }

  countNodes(obj) {
    const that = this
    this.count++
    return (function() {
      if (!obj || that.isEmpty(obj)) {
        return false
      }
      else {
        if (obj[that.children]) {
          obj[that.children].forEach(function(child) {
            that.countNodes(child)
          })
        }
      }
    }())
  }

  generateClone(obj) {
    const target = {}
    for (const i in obj) {
      if (i !== this.children) {
        target[i] = obj[i]
      }
    }
    return target
  }

  findNodeById(obj, id, callback) {
    if (obj[this.id] === id || obj.ids.some((testId) => testId === id)) {
      this.count = this.total + 0
      callback(null, obj)
    }
    else {
      if (this.count === 1) {
        this.count = this.total + 0
        callback(new Error('the node does not exist'))
      }
      else {
        this.count--
        if (obj[this.children]) {
          const that = this
          obj[this.children].forEach(function(node) {
            that.findNodeById(node, id, callback)
          })
        }
      }
    }
  }

  matchConditions(obj, conditions) {
    let flag = true
    Object.keys(conditions).forEach(function(item) {
      if (typeof conditions[item] === 'string' || typeof conditions[item] === 'number') {
        if (obj[item] !== conditions[item]) {
          flag = false
          return false
        }
      }
      else if (conditions[item] instanceof RegExp) {
        if (!conditions[item].test(obj[item])) {
          flag = false
          return false
        }
      }
      else if (typeof conditions[item] === 'object') {
        Object.keys(conditions[item]).forEach(function(subitem) {
          switch (subitem) {
          case '>': {
            if (!(obj[item] > conditions[item][subitem])) {
              flag = false
              return false
            }
            break
          }
          case '<': {
            if (!(obj[item] < conditions[item][subitem])) {
              flag = false
              return false
            }
            break
          }
          case '>=': {
            if (!(obj[item] >= conditions[item][subitem])) {
              flag = false
              return false
            }
            break
          }
          case '<=': {
            if (!(obj[item] <= conditions[item][subitem])) {
              flag = false
              return false
            }
            break
          }
          case '!==': {
            if (!(obj[item] !== conditions[item][subitem])) {
              flag = false
              return false
            }
            break
          }
          }
        })
        if (!flag) {
          return false
        }
      }
    })
    if (!flag) {
      return false
    }
    return true
  }

  findNodes(obj, conditions, callback) {
    const that = this
    let copy = [] // ths shallow copy of nodes array
    return (function(obj, conditions, callback) {
      if (that.matchConditions(obj, conditions)) {
        nodes.push(obj)
        if (that.count === 1) {
          that.count = that.total + 0
          copy = nodes.slice(0)
          nodes = []
          callback(null, copy)
        }
        that.count--
      }
      else {
        if (that.count === 1) {
          that.count = that.total + 0
          copy = nodes.slice(0)
          nodes = []
          callback(null, copy)
        }
        that.count--
        if (obj[that.children]) {
          obj[that.children].forEach(function(child) {
            that.findNodes(child, conditions, callback)
          })
        }
      }
    }(obj, conditions, callback))
  }

  findParent(obj, node, callback, needCleanNode) {
    const that = this
    this.findNodeById(obj, node.parent_id, (err, parent) => {
      if (err) callback(new Error(`Could not find parent. ${err}`))
      else {
        if (needCleanNode) {
          callback(null, that.generateClone(parent))
        }
        else {
          callback(null, parent)
        }
      }
    })
  }

  findSiblings(obj, node, callback) {
    const that = this
    this.findParent(obj, node, function(err, parent) {
      if (err) {
        callback(new Error('its sibling nodes do not exist'))
      }
      else {
        const siblings = []
        parent[that.children].forEach(function(item) {
          if (item[that.id] !== node[that.id]) {
            siblings.push(that.generateClone(item))
          }
        })
        callback(null, siblings)
      }
    }, false)
  }

  findAncestors(obj, node, callback) {
    const that = this
    if (node[this.id] === obj[this.id]) {
      const copy = nodes.slice(0)
      nodes = []
      callback(null, copy)
    }
    else {
      this.findParent(obj, node, function(err, parent) {
        if (err) {
          callback(new Error('its ancestor nodes do not exist'))
        }
        else {
          nodes.push(parent)
          that.findAncestors(obj, parent, callback)
        }
      })
    }
  }
}

export { JSONLoop }
