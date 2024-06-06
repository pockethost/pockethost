const express = require('express')

const app = express()

app.get(`/apix/status`, (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(3000, () => {
  console.log(`Listening on 3000`)
})
