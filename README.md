# express-kv-api

express插件：key-value 形式，简单模拟api，结合 mockjs 更灵活。最简单的后端请求模拟方式，可用于前端本地测试。

## use

安装：

```cmd
npm install express-kv-api --save-dev
```

在server文件中拦截请求：

```js
var kvApi = require('express-kv-api')

var express = require('express')
var path = require('path')
var process = require('process')

var app = express()

app.use(kvApi({
  filePath: path.join(process.cwd(), 'server'), // 接口文件夹路径，默认为项目下的`server`文件
  dataDeal (data) { // 数据处理函数，可用于统一的数据包装，默认直接返回data
    return {
      success: true,
      data: data,
      message: '请求成功',
    }
  }
}))
app.listen(8080)
...

```

接口文件，可获取到请求参数，做简单逻辑处理。
请求地址按[express格式](http://expressjs.com/en/4x/api.html#path-examples),
返回数据按[mock语法规范](https://github.com/nuysoft/Mock/wiki/Syntax-Specification)。
书写示范:

```js
module.exports = {
  /**
   * 指明method为post，默认为get
   */
  'post /api/add': true,
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