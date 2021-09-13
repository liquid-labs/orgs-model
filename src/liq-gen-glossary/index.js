import { generateGlossary } from './generate-glossary'

// TODO: the use of an 'index' file is a little misleading in this case. We want to build a tool, not a 'bundle'. We would like to update the catalyst-scripts (which need to be reworked) to be a bit more flexible.

const dashCase = (term) => {
  return term.toLowerCase().replace(/[^a-z0-9]/ig, '-')
}

const definitionFiles = [...process.argv.slice(2)]

const allTerms = generateGlossary({ definitionFiles })

const caseInsensitiveSort = function(a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  if (a < b) {
    return -1
  }
  else if (a > b) {
    return 1
  }
  else { // names must be equal
    return 0
  }
}

// Note: 'console.log(...)' adds it's own newline, so the '\n' in the following creates a blank line.
console.log('# Glossary\n')
console.log('<dl>\n')

const keys = Object.keys(allTerms) || []
keys.sort(caseInsensitiveSort)

for (const term of keys) {
  console.log(`<dt id="${dashCase(term)}">${term}</dt>`)
  console.log(`<dd>\n\n${allTerms[term]}\n\n</dd>\n\n`) // the blank line tells Markdown to process the contents.
}

console.log('</dl>')
