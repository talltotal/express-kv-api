# express-kv-api

express插件：key-value 形式，简单模拟api，结合 mockjs 更灵活。最简单的后端请求模拟方式，可用于前端本地测试。

## Installation

```cmd
npm install express-kv-api --save-dev
```

## Usage

### Server
#### for `express`

```js

const bodyParser = require('body-parser')
const kvApi = require('express-kv-api')
const express = require('express')

const path = require('path')
const process = require('process')

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(kvApi({
  // 接口文件夹路径，默认为项目下的`server`文件，支持 json/js 文件
  dirPath: path.join(process.cwd(), 'server'),
  // 数据处理函数，可用于统一的数据包装，默认直接返回data
  dataWrap (data) {
    return {
      success: true,
      data: data,
      message: '请求成功',
    }
  },
  // 以目录结构划分模块
  moduleByPath: false,
  // 请求的默认方法，默认为all
  defaultMathod: 'post'
}))

app.listen(8080)
...

```

#### for `webpack-dev-server`

```js
const bodyParser = require('body-parser')
const kvApi = require('express-kv-api')

const config = {
  ...,
  after (app) {
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.use(kvApi({
      dataWrap (data) {
        return {
          success: true,
          data: data,
          message: '请求成功',
        }
      },
    }))
  }
}
```

#### for `@vue/cli-service`

```js
const bodyParser = require('body-parser')
const kvApi = require('express-kv-api')

const config = {
  ...,
  devServer: {
    ...,
    after (app) {
      app.use(bodyParser.urlencoded({ extended: false }))
      app.use(bodyParser.json())
      app.use(kvApi({
        dataWrap (data) {
          return {
            success: true,
            data: data,
            message: '请求成功',
          }
        },
      }))
    }
  }
}
```

### API
接口文件，可获取到请求参数，做简单逻辑处理。
请求地址按[express格式](http://expressjs.com/en/4x/api.html#path-examples),
返回数据按[mock语法规范](https://github.com/nuysoft/Mock/wiki/Syntax-Specification)。
书写示范:

```js
module.exports = {
  /**
   * 指明method为post，默认为all
   * 延迟1000ms请求返回
   */
  'post|1000 /api/add': true,
  /**
   * function形式，将参数传入
   * {
   *  params:[],
   *  ...req.query,
   *  ...req.body,
   * }
   */
  '/api/service/(getAll|getList)' (data) {
    return {
      type: data.params[0],
      id: data.id,
      'child|2-8': [
        {
          'id|+1': data.id * 100,
          name: 'test3',
        }
      ]
    }
  },
}
```

