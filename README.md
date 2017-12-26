# express-kv-api

express插件：key-value 形式，简单模拟api。


## use

install

```
npm install express-kv-api --save-dev
```

```
var kvApi = require('express-kv-api')

var express = require('express')
var path = require('path')
var process = require('process')

var app = express()

app.all('*', kvApi({
  filePath: path.join(process.cwd(), 'server'), // 接口文件夹路径，默认为项目下的`server`文件
  dataDeal (data) { // 数据处理函数，可用于统一的数据包装，默认直接返回data
    return {
      success: true,
      data: data,
      message: '请求成功',
    }
  }
}))

...

```

接口文件:
```
module.exports = {
  '/api/service/getAll': function (req) {
    if (req.type === 1) {
      return [
        {
          id: 1,
          name: 'test1',
        },
        {
          id: 2,
          name: 'test2',
        },
      ]
    }

    return [
      {
        id: 3,
        name: 'test3',
      },
      {
        id: 4,
        name: 'test4',
      },
    ]
  },
}
```