const replace = require('replace-in-file')
module.exports = {
  helpers: {
    replace: (files, from, to) => {
      try {
        const results = replace.sync({
          files,
          from,
          to,
        })
        console.log('Replacement results:', results)
      } catch (error) {
        console.error('Error occurred:', error)
      }
    },
  },
}
