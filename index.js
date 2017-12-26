var watch = require('node-watch')
var fs = require('fs')
var _ = require('lodash')
var path = require('path')
var process = require('process')

module.exports = function (options) {
  var _options = _.assign({
    filePath: path.join(process.cwd(), 'server'),
    dataDeal: function (data) {
      return data
      /*
      {
        success: true,
        data: data,
        message: '请求成功',
      }
      */
    }
  }, options || {})

  const API_FILE_PATH = _options.filePath
  var Api = {}

  function updateApis (apiFilePath) {
    // 排除隐藏文件
    if (apiFilePath.match(/(\/\.)|(\\\.)/g) !== null) {
      return
    }

    if (fs.existsSync(apiFilePath)) {
      // 清除缓存
      delete require.cache[apiFilePath]
      _.assign(Api, require(apiFilePath))
    } else {
      // 文件删除
      Api = {}
      loadAll()
    }
  }

  function loadAll () {
    var filePaths = fs.readdirSync(API_FILE_PATH)
    _.each(filePaths, function (apiFilePath) {
      updateApis(path.resolve(API_FILE_PATH, apiFilePath))
    })
  }

  function init () {
    loadAll()

    watch(API_FILE_PATH, function (e, apiFilePath) {
      updateApis(apiFilePath)
    })
  }

  init()

  return function (req, res, next) {
    var api = Api[req.params[0]]
    if (!!api) {
      var data
      if (typeof api === 'function') {
        data = api(_.extend(req.query, req.body))
      } else {
        data = api
      }

      res.send(_options.dataDeal(data))
    } else {
      res.status(404)
      res.send('404')
    }
  }
}
