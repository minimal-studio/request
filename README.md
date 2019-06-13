# Uke Request

基于 fetch API 的进一步封装, 提供订阅发布与中间件机制。

[![Build Status](https://travis-ci.com/SANGET/uke-request.svg?branch=master)](https://travis-ci.com/SANGET/uke-request)
[![install size](https://packagephobia.now.sh/badge?p=uke-request)](https://packagephobia.now.sh/result?p=uke-request)

- [帮助文档](https://request.ukelli.com/)

## Basic Usage

> Support RESTFul

以下事例以 `$R` 指定 `RequestClass` 的实例

```js
import { RequestClass } from 'uke-request/request';

const $R = new RequestClass();

// 可以为每一个请求对象设置配置
$R.setConfig({
  baseUrl: 'https://example.com', // 默认的请求地址
  commonHeaders: {} // 所有的请求 headers
});

const getRes = await $R.get('/path');
const postRes = await $R.post('/path', {
  ID: '123'
});
const putRes = await $R.put('/path', {
  ID: '123'
});
const delRes = await $R.del('/path', {
  ID: '123'
});
```

## Adavance Usage

### 把 params 转换成 query url

```js
// get, 使用 params 自动转换成对应的 url
// 最终请求： ${baseUrl}/item-list?id=123&other=123
let res = await $R.get({
  url: '/item-list',
  headers: {},
  params: {
    id: 123,
    other: 321
  },
  isBase64: false // 用于加密 params 的值
});

// 统一的检查 res status 的状态，如果 return false，则触发 onErr
$R.checkStatus = (originRes) => {
  return true;
}
```

### 事件订阅

$R 提供两种订阅事件 `onRes` `onErr`, 并且会响应每个请求都

```js
// 每当有 res 的时候执行
$R.on('onRes', (resDetail) => {
  resDetail = {
    data: {},
    originRes: {},
    originReq: {},
    err: null
  }
});

// 每当发生错误时执行
$R.on('onErr', (resDetail) => {
  resDetail = {
    data: {},
    originRes: {},
    originReq: {},
    err: errMsg
  }
});
```

### 错误触发 & 错误处理

$R 将根据 checkStatus 返回值判断是否进入错误处理流程, 错误处理流程有两种方式

1. 订阅 `$R.on('onErr', function errHandle() {})`
2. 为每一个请求订阅的错误回调 `$R.get({ url: '', onError: function errHandle() {} })`

注意: __如果传入了 onError 回调，则不执行通过 $R.on('onErr') 订阅的回调__

```ts
// override checkStatus
$R.checkStatus = (fetchRes: Response): boolean => false

// 如果传入了 onError 回调，则不执行通过 $R.on('onErr') 订阅的回调
$R.get({
  url: '/get-stuff',
  onError: (data) => {
    console.log(data)
  }
})

$R.on('onErr', function errHandle(data) {
  console.log(data)
})
```

### 中间件

中间件处理有两个触发时机, 一旦注册，则每次请求都会触发，__并且原来用于提交的 data 将会被中间件返回的值替换__。

1. 请求前 before req
2. 响应后 after res

```js
const before = (reqData) => {
  return reqData;
}
const after = (resData) => {
  return resData;
}
$R.use([before, after])

let postRes = await $R.post('/item-list', data, options);
```

### 内置中间件

通讯加密

```js
import { encrypt, decrypt } from 'uke-request/request-middleware/encrypt-helper';

const encryptKey = '123';

$R.use([encrypt(encryptKey), decrypt(encryptKey)]);

// $R 会将 {ID: '321'} 以 '123' 为加密 key 进行 rc4 加密并发送到服务器
// 收到响应后以同样方式解密，如果服务端返回的数据也时同样方式加密的话
const resPost = await $R.post(testUrl + '/encrypt', {
  ID: '321'
});
```

## `$R` API

```ts
interface RequestParams {
  url: string;
  method?: RequestMethod;
  sendType?: RequestSendTypes;
  data: {};
  headers?: {};
  params?: ParamEntity;
  returnRaw?: boolean;
  onError?: Function;
}
interface RequestConfig {
  baseUrl: string;
  commonHeaders: {};
  timeout: number;
  resMark: string;
  errMark: string;
}
interface MiddlewareOptions {
  after?: Function | Function[];
  before?: Function | Function[];
}

// 底层 request API
$R.request(params: RequestParams)

// 设置 $R 配置
$R.setConfig(config: RequestConfig)

// 使用中间件
$R.use(options: MiddlewareOptions | Function[])

// 同 $R.use([before])
$R.useBefore(Function | Function[])

// 同 $R.use([null, after])
$R.useAfter(Function | Function[])

// url 包装
$R.urlFilter(path: string, params?: ParamEntity)

// 上传
$R.upload(path: string, data: RequestInit["body"])
```

`$R.request` 为通用底层接口，其他的 `$R.get` `$R.post` `$R.del` `$R.put` `$R.patch` 均为该接口的上层应用封装。

```js
// 其他方式, options 同 fetch API，sendData 如果是 js，将自动做 header 对应的转换
let res = await $R.request({
  url, data, headers, method = 'POST',
  returnRaw = false, // 是否返回完整的 res 状态 return returnAll ? res : res.data
  ...other
});
```

## url resolve

`uke-request` 提供，用于解析前端的 `url` 的 `API`

```js
import {
  toBase64Str, fromBase64Str,
  getUrlParams, searchUrlParams, urlParamsToQuery, openWindowUseHashUrl,
  resolveUrl, decodeHashUrl
} from 'uke-request/url-resolve';
```

### urlParamsToQuery

```js
const urlParamsConfig = {
  url: 'https://ss.com',
  params: {
    id: '1',
    req: {
      sessID: 123,
      username: 'alex',
    }
  },
  toBase64: false // 如果为 true，则将值进行 base64 转换
}

urlParamsToQuery(urlParamsConfig); // 输出 'https://ss.com?id=1&req={sessID:123,username=alex}'
```

### getUrlParams

```js
// 若此时的 url 为 'https://ss.com?id=1&req={sessID:123,username=alex}'
const res = getUrlParams(id); // res = 1
```

### resolveUrl

```js
resolveUrl('https://a.com', 'path1', 'path2'); // 输出 'https://a.com/path1/path2'
```

- [其他模块说明](./docs/other-desc.md)
