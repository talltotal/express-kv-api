const express = require('express')
const bodyParser = require('body-parser')
const kvApi = require('../index')
const app = express()
const portfinder = require('portfinder')
const getServer = () => {
  return server
}
let server

portfinder.basePort = 8080

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(kvApi({
  dirPath: './example/apis',
  dataWrap (data) {
    return {
      code: 20000,
      data,
      msg: '请求成功',
    }
  },
  reqDataWrap (req, params) {
    return {
      params,
      ...req.params,
      ...req.query,
      ...req.body,
      tt: 1
    }
  },
  moduleByPath: true,
}))

portfinder.getPortPromise().then((port) => {
  server = app.listen(port)
  console.log(`Start App: ${port}`)
})

module.exports = { app, getServer }
