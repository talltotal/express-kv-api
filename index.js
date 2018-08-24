var path = require('path')
var process = require('process')
var fs = require('fs')
var _ = require('lodash')
var watch = require('node-watch')
var Mock = require('mockjs')
var pathRegexp = require('path-to-regexp')


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
    },
  }, options || {})

  const API_FILE_PATH = _options.filePath
  /**
   * {
   *  get: {
   *    '/api/xxx': {...},
   *  },
   *  post: {
   *    '/api/xxx': {...},
   *  },
   * }
   */
  let Api

  function updateApis (apiFilePath) {
    // 排除隐藏文件
    if (apiFilePath.match(/(\/\.)|(\\\.)/g) !== null) {
      return
    }

    // 清除缓存
    delete require.cache[apiFilePath]
    const config = require(apiFilePath)
    Object.keys(config).forEach((key) => {
      const { method, path } = parseKey(key)
      if (!Api[method]) {
        Api[method] = {}
      }
      Api[method][path] = config[key]
    })
  }

  function loadAll () {
    Api = {}
    var filePaths = fs.readdirSync(API_FILE_PATH)
    _.forEach(filePaths, (apiFilePath) => {
      updateApis(path.resolve(API_FILE_PATH, apiFilePath))
    })
  }

  function init () {
    loadAll()

    watch(API_FILE_PATH, (e, apiFilePath) => {
      loadAll(apiFilePath)
    })
  }

  init()

  return function (req, res, next) {
    const method = req.method.toLowerCase()
    const path = req.path
    
    var apis = Api[method]
    if (apis) {
      let hasMatch = false
      Object.keys(apis).forEach((key) => {
        if (hasMatch) return
        const value = apis[key]
        const re = pathRegexp(key, [], {
          sensitive: false,
          strict: false,
          end: true
        })
        // match
        const match = re.exec(path)
        if (path === '*' || match) {
          hasMatch = true

          // send
          let data
          if (typeof value === 'function') {
            data = value(_.extend({
              params: _.filter(match, (item, i) => i),
            }, req.query, req.body))
          } else {
            data = value
          }
          res.json(_options.dataDeal(Mock.mock(data)))
        }
      })

      if (!hasMatch) {
        next()
      }
    } else {
      next()
    }
  }
}

function parseKey (key) {
  // 默认为 get 请求
  let method = 'get'
  let path = key

  if (key.indexOf(' ') > -1) {
    const splited = key.split(' ')
    method = splited[0].toLowerCase()
    path = splited[1]
  }

  return { method, path }
}
