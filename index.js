/**
 * 通过key-value形式配置mock数据
 * - key: `${method}|${dalay} ${path/regexp}`
 * - value:
 *  - mockData
 *  - funtion ({ params: [...path/regexp], ...query, ...body }) { return mockData || function (response) {} }
 * 
 * 处理过程
 * - 文件夹内任何变动都重新加载api
 * - 文件中都kv转变格式用于处理
 *  - { [method]: { [path/regexp]: { dalay, value } } }
 * - 匹配([method]~[path/regexp])并处理({ dalay, value })请求
 */
const path = require('path')
const process = require('process')
const fs = require('fs')
const _ = require('lodash')
const watch = require('node-watch')
const Mock = require('mockjs')
const { pathToRegexp } = require('path-to-regexp')
const glob = require('glob')

/** 全局配置 */
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

const Key = {
  /**
   * 解析
   * @param {string} str 
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
 * @param {Request} req 
 * @param {Response} res 
 * @param {Object} apiObj 
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
 * @param {object} opts
 * @param {string} [opts.dirPath] server routers' dir path；接口文件夹
 * @param {(data: any) => any} [opts.dataWrap] warp response data；处理数据整体包装函数
 * @param {string} [opts.defaultMathod] default mathod for routers matching；请求的默认方法
 * @param {boolean} [opts.moduleByPath] 以目录结构划分模块
 * @param {boolean} [opts.watch] 是否监听接口文件夹内变动
 * @param {(req: Request, params: Array) => any} [opts.reqDataWrap] warp request data for routers
 * @returns {(req: Request, res: Response, next: Function) => any}
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
