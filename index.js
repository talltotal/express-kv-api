/**
 * 通过key-value形式配置mock数据
 * - key: `${method}|${dalay} ${path/regexp}`
 * - value:
 *  - mockData
 *  - funtion ({ params: [...path/regexp], ...query, ...body }) { return mockData || function (response) {} }
 * 
 * 整体配置
 * - dirPath: 接口文件夹
 * - dataWrap: 处理数据整体包装函数
 * - moduleByPath: 以目录结构划分模块
 * 
 * 处理过程
 * - 文件夹内任何变动都重新加载api
 * - 文件中都kv转变格式用于处理
 *  - { [method]: { [path/regexp]: { dalay, value } } }
 * - 匹配([method]~[path/regexp])并处理({ dalay, value })请求
 * 
 * TODO
 * - 文件上传
 * - 模块化
 *  - 按文件名
 * - 代理
 */
const path = require('path')
const process = require('process')
const fs = require('fs')
const _ = require('lodash')
const watch = require('node-watch')
const Mock = require('mockjs')
const pathRegexp = require('path-to-regexp')
const glob = require('glob')

const Options = {
  dirPath: undefined,
  dataWrap: undefined,
  moduleByPath: false,
}

const Key = {
  parse (str) {
    // 默认为 get 请求
    let method = 'get'
    let delay = 0
    let path = str

    if (str.indexOf(' ') > -1) {
      try {
        const mp = str.split(' ')
        const md = mp[0].split('|')

        method = md[0].toLowerCase() || 'get'
        delay = Number(md[1] || 0)
        path = mp[1]
      } catch (err) {
        console.error('Express-kv-api: Key parse error!')
      }
    }

    return { method, delay, path }
  },
}

function resetApisFromDir (apiObj) {
  const dir = Options.dirPath
  glob(path.join(dir, '**/*.{json,js}'), (err, files) => {
    _.forEach(files, (apiFilePath) => {
      addApisFromFile(apiObj, apiFilePath)
    })
  })
}

function matchApiAndHandle (req, res, apiObj) {
  const method = req.method.toLowerCase()
  const path = req.path
  const methodObj = apiObj[method]

  if (!methodObj) return false

  for (let key in methodObj) {
    const pR = pathRegexp(key, undefined, {
      sensitive: true,
    })
    const match = pR.exec(path)

    if (path === '*' || match) {
      const params = _.extend(
        {
          params: [].slice.call(match, 1),
        },
        req.query,
        req.body,
      )

      handleRes(methodObj[key], params, res)

      return true
    }
  }

  return false
}

function addApisFromFile (apiObj, apiFilePath) {
  const isHideFile = !!apiFilePath.match(/(\/\.)|(\\\.)/g)
  if (isHideFile) return

  // 清除缓存
  delete require.cache[apiFilePath]

  const fileData = require(apiFilePath)
  const childPath = apiFilePath.replace(new RegExp(`^${Options.dirPath}`), '')
  const childPathObj = path.parse(childPath)
  const baseNamespace = Options.moduleByPath ? `${childPathObj.dir}${path.sep}${childPathObj.name}` : ''

  if (_.isArray(fileData)) {
    _.forEach(fileData, ({ namespace, api }) => {
      if (_.isString(namespace) && _.isObject(api)) {
        addApiFromObj(apiObj, api, baseNamespace, namespace)
      }
    })
  } else if (_.isObject(fileData)) {
    addApiFromObj(apiObj, fileData, baseNamespace)
  }
}

function addApiFromObj (target, source, ...namespaces) {
  Object.keys(source).forEach((key) => {
    const { method, delay, path: apiPath } = Key.parse(key)
    const methodObj = target[method] || (target[method] = {})

    methodObj[path.join('/', ...namespaces, apiPath)] = {
      delay,
      value: source[key],
    }
  })
}

function handleRes ({ delay, value}, params, res) {
  function main () {
    if (typeof value === 'function') {
      try {
        const result = value(params)
  
        if (typeof result === 'function') {
          result(res)
        } else {
          res.json(Options.dataWrap(Mock.mock(result)))
        }
      } catch (err) {
        res.status(500).send('Api Error: ' + err)
      }
    } else {
      res.json(Options.dataWrap(Mock.mock(value)))
    }
  }

  if (delay) {
    setTimeout(main, delay)
  } else {
    main()
  }
}

module.exports = function ({ filePath, dirPath = 'server', dataDeal, dataWrap, moduleByPath } = {}) {
  let Api = {}

  Options.dirPath = path.join(process.cwd(), filePath || dirPath)
  Options.dataWrap = dataDeal || dataWrap || function (data) {
    return data
  }
  Options.moduleByPath = !!moduleByPath

  resetApisFromDir(Api)
  watch(Options.dirPath, { recursive: true }, () => {
    Api = {}
    resetApisFromDir(Api)
  })

  return function (req, res, next) {
    if (!matchApiAndHandle(req, res, Api)) {
      next()
    }
  }
}
