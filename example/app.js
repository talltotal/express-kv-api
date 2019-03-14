var express = require('express')
var kvApi = require('../index')

var app = express()

app.use(kvApi({
  dirPath: 'example/apis',
  dataWrap (data) {
    return {
      code: 20000,
      data,
      msg: '请求成功',
    }
  },
  moduleByPath: true,
}))

const server = app.listen(8080)
console.log('Start App: 8080')

module.exports = { app, server }
