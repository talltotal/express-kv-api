var express = require('express')
var bodyParser = require('body-parser')
var kvApi = require('../index')

var app = express()

app.use(bodyParser.urlencoded({ extended: false }));
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

const server = app.listen(8080)
console.log('Start App: 8080')

module.exports = { app, server }
