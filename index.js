/**
 * @author talltotal
 * @overview 通过key-value形式配置mock数据
 * - key: `${method}|${dalay} ${path/regexp}`
 * - value:
 *    - mockData
 *    - funtion ({ params: [...path/regexp], ...query, ...body }) { return mockData || function (response) {} }
 * 
 * 处理过程
 * - 文件夹内任何变动都重新加载api
 * - 文件中都kv转变格式用于处理
 *    - { [method]: { [path/regexp]: { dalay, value } } }
 * - 匹配([method]~[path/regexp])并处理({ dalay, value })请求
 */

/**
 * @module Express_kv_api
 */

const path = require('path')
const process = require('process')
const fs = require('fs')
const _ = require('lodash')
const watch = require('node-watch')
const Mock = require('mockjs')
const { pathToRegexp } = require('path-to-regexp')
const glob = require('glob')

/**
 * @callback DataWrap
 * @param {*} resData 响应数据
 * @returns {*}
 */

/**
 * @callback ReqDataWrap
 * @param {Request} req 请求对象
 * @param {Array} params 请求path中的参数
 * @returns {Object}
 */

/**
 * @typedef {Object} Options
 * @property {string} dirPath 存放接口配置的文件夹路径
 * @property {DataWrap} dataWrap 响应数据处理函数
 * @property {string} [defaultMathod=all] 默认请求mathod
 * @property {boolean} [moduleByPath=false] 以文件路径为请求路径
 * @property {ReqDataWrap} reqDataWrap 请求数据处理函数
 */

/** 全局配置
 * @type {Options}
 */
const Options = {
  dirPath: '',
  dataWrap: (data) => data,
  defaultMathod: 'all',
  moduleByPath: false,
  reqDataWrap: (req, params = []) => {
    return _.extend(
      {
        params,
      },
      req.params,
      req.query,
      req.body,
    )
  },
}

/** @namespace */
const Key = {
  /**
   * 解析Key
   * @param {string} str key字符串
   * @returns {{method: string, delay: number, path: string}}
   */
  parse (str) {
    // 默认为 get 请求
    let method = Options.defaultMathod || 'all'
    let delay = 0
    let path = str

    if (str.indexOf(' ') > -1) {
      try {
        const mp = str.split(' ')
        const [lMethod, lDelay] = mp[0].split('|')

        method = (lMethod || method).toLowerCase()
        delay = Number(lDelay || 0)
        path = mp[1]
      } catch (err) {
        console.error('Express-kv-api: Key parse error!')
      }
    }

    return { method, delay, path }
  },
}

/**
 * 从文件获取数据重置接口对象
 * @param {Object} apiObj 接口对象
 */
function resetApisFromDir (apiObj) {
  const dir = Options.dirPath
  glob(path.join(dir, '**/*.{json,js}'), (err, files) => {
    _.forEach(files, (apiFilePath) => {
      try {
        addApisFromFile(apiObj, apiFilePath)
      } catch (e) {
        console.error('Express_kv_api::error:', e)
      }
    })
  })
}

/**
 * 匹配并处理接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 * @param {Object} apiObj 接口对象
 * @returns {boolean}
 */
function matchApiAndHandle (req, res, apiObj) {
  const method = req.method.toLowerCase()
  const path = req.path
  const methodObjs = [apiObj[method] || {}, apiObj.all || {}]
  for (let methodObj of methodObjs) {
    for (let key in methodObj) {
      const pR = pathToRegexp(key, undefined, {
        sensitive: true,
      })
      const match = pR.exec(path)
  
      if (path === '*' || match) {
        handleRes(methodObj[key], {
          req,
          params: [].slice.call(match, 1),
        }, res)
  
        return true
      }
    }
  }

  return false
}

/**
 * 从文件获取配置，往接口对象增加数据
 * @param {Object} apiObj 接口对象
 * @param {string} apiFilePath 接口配置文件路径
 */
function addApisFromFile (apiObj, apiFilePath) {
  const relativePath = path.relative(Options.dirPath, apiFilePath)
  const isHideFile = !!relativePath.match(/(\/\.)|(\\\.)/g)
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

/**
 * 解析配置格式为易匹配的格式，转存到目标对象中
 * @param {Object} target 目标对象
 * @param {Object} source 源对象
 * @param  {...string} namespaces 数据的命名空间
 */
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

/**
 * 响应请求
 * @param {Object} param0 配置数据
 * @param {number} param0.delay 延迟时长
 * @param {*} param0.value 接口
 * @param {Object} param1 请求数据
 * @param {Request} param1.req 请求对象
 * @param {Object} param1.params 请求参数
 * @param {Response} res 响应
 */
function handleRes ({ delay, value }, { req, params }, res) {
  function main () {
    if (typeof value === 'function') {
      try {
        const result = value(Options.reqDataWrap(req, params))
  
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

/**
 * 返回express路由函数
 * @param {object} opts
 * @param {string} [opts.dirPath=server] server routers' dir path；接口文件夹
 * @param {DataWrap} opts.dataWrap warp response data；处理数据整体包装函数
 * @param {string} opts.defaultMathod default mathod for routers matching；请求的默认方法
 * @param {boolean} [opts.moduleByPath=false] 以目录结构划分模块
 * @param {boolean} [opts.watch=true] 是否监听接口文件夹内变动
 * @param {ReqDataWrap} opts.reqDataWrap warp request data for routers
 * @returns {function}
 */
module.exports = function (opts = {}) {
  const {
    filePath,
    dirPath = 'server',
    dataDeal,
    dataWrap,
    moduleByPath,
    reqDataWrap,
    defaultMathod,
    watch: isWatch = true
  } = opts
  let Api = {}
  let _filePath = filePath || dirPath
  if (!fs.existsSync(_filePath)) {
    _filePath = path.join(process.cwd(), _filePath)
  } else {
    _filePath = path.resolve(_filePath)
  }
  Options.dirPath = _filePath
  Options.dataWrap = dataDeal || dataWrap || Options.dataWrap
  Options.reqDataWrap = reqDataWrap || Options.reqDataWrap
  Options.moduleByPath = !!moduleByPath
  Options.defaultMathod = (defaultMathod || Options.defaultMathod).toLowerCase()

  resetApisFromDir(Api)
  if (isWatch) {
    watch(Options.dirPath, { recursive: true }, () => {
      Api = {}
      resetApisFromDir(Api)
    })
  }

  return function (req, res, next) {
    if (!matchApiAndHandle(req, res, Api)) {
      next()
    }
  }
}
