# @mini-code/request

基于 fetch API 封装, 提供更友好便捷的 RESTFul 操作。

<!-- [![Build Status](https://travis-ci.com/SANGET/uke-request.svg?branch=master)](https://travis-ci.com/SANGET/uke-request) -->
<!-- [![install size](https://packagephobia.now.sh/badge?p=uke-request)](https://packagephobia.now.sh/result?p=uke-request) -->

## Install

```shell
yarn add @mini-code/request
```

## Basic Usage

```js
import { RequestClass } from '@mini-code/request';

// 构造 $R 请求实例
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

## Request APIs

### [get] API

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
```

### [post, put, del, patch] APIs

#### 使用基本参数

```js
const postData = {
  username: 'aaa',
  password: 'bbb'
};
const reqOptions = {

}
let res = await $R.post('/postUrl', postData, reqOptions);
let res = await $R.put('/postUrl', postData, reqOptions);
let res = await $R.del('/postUrl', postData, reqOptions);
let res = await $R.patch('/postUrl', postData, reqOptions);
```

reqOptions 参数结构

```ts
interface RequestParams {
  /** 当前请求的 headers */
  headers?: {};
  /** 把参数 params 中转化成 query url */
  params?: Map;
  /** 如果当前请求发生错误，则触发的回调 */
  onError?: (event) => void;
}
const reqOptions: RequestParams = {

}
```

#### 使用 reqParams 参数

```ts
// reqParams 数据结构
interface BaseRequestParams {
  /** 请求的 url，将拼接在 baseUrl 之后 */
  url: string;
  /** 请求的 http 方法 */
  method?: RequestMethod;
  /** 当前请求的 data */
  data?: {};
  /** 当前请求的 headers */
  headers?: {};
  /** 当前请求的 params，用于封装成 query url */
  params?: ParamEntity;
  /** 如果当前请求发生错误，则触发的回调 */
  onError?: (event) => void;
}

const reqParams: BaseRequestParams = {
  url: '/postUrl',
  data: {},
  headers: {},
  params: {
    id: '123'
  }
}
let res = await $R.post(reqParams);
let res = await $R.put(reqParams);
let res = await $R.del(reqParams);
let res = await $R.patch(reqParams);
```

### [request] API

基础请求 API，上述 API 均为此 API 的封装

```ts
interface RequestParams {
  url: string;
  method?: RequestMethod;
  data?: {};
  headers?: {};
  params?: ParamEntity;
  onError?: (event) => void;
}

const requestOptions: RequestParams = {
  url: '/requestUrl',
  method: 'POST',
  data: {},
  header: FetchHeader,
  params: {},
}

// 这样就发起一个 post 请求
const res = $R.request(requestOptions);
```

## Response

### 数据结构

所有 request API 都返回统一的 ResData 数据结构

```ts
interface ResData {
  /** 由开发者自定义的返回结构 */
  [key: string]: any;
  /** 如果返回的结果是 string 类型，则封装在此字段 */
  __text?: string;
  /** 原生的 fetch Request */
  __originReq?: Request;
  /** 原生的 fetch Response */
  __originRes?: Response;
  /** 是否发生 http 错误
   * 由 $R.checkStatus 回调返回
   * 并且将会触发传入到 request api 中的 onError
   */
  __err?: string;
}

const res: ResData = $R.post('', data);
```

### 检查 Response 状态

```js
// 统一的检查 res status 的状态，如果 return false，则触发 onErr
$R.checkStatus = (originRes) => {
  return true;
}
```

### 事件 Res 订阅

如果订阅了 `$R` 提供的事件 `onRes` `onErr`，每次都会触发

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

1. 订阅 `$R.on('onErr', errHandle = () => {})`
2. 为每一个请求传入 onError 回调 `$R.get({ url: '', onError: errHandle = () => {} })`

注意: __如果传入了 onError 回调，则不执行通过 $R.on('onErr') 订阅的回调__

```ts
// override checkStatus
$R.checkStatus = (fetchRes: Response): boolean => fetchRes.status !== 200

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

## 中间件 Middleware

中间件处理有两个触发时机, 一旦注册，则每次请求都会触发，__并且原来用于提交的 data 将会被中间件返回的值替换__。

1. `before`: 发起 request 前
2. `after`: 收到 response 后，返回数据前

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

```ts
import { encrypt, decrypt } from '@mini-code/request/request-middleware/encrypt-helper';
import { compress, decompress } from '@mini-code/request/request-middleware/compress-helper';

const encryptKey = '123';

// 使用加密解密
$R.use([encrypt(encryptKey), decrypt(encryptKey)]);

// $R 会将 {ID: '321'} 以 '123' 为加密 key 进行 rc4 加密并发送到服务器
// 收到响应后以同样方式解密，如果服务端返回的数据也时同样方式加密的话
const resPost = await $R.post(testUrl + '/encrypt', {
  ID: '321'
});

// 使用内容压缩
// dataWrapper、dataWrapperBeforeDecompress、dataWrapperAfterDecompress 均为格式调整回调，
interface CompressParams {
  data: {};
  isCompress: boolean;
}

interface DecompressParams {
  data: string;
  isCompress: boolean;
}
const dataWrapper(data: CompressParams): CompressParams => {};
const dataWrapperBeforeDecompress(data: DecompressParams): DecompressParams => {};
const dataWrapperAfterDecompress(data: DecompressParams): DecompressParams => {};

$R.use([
  compress(limitedLen, dataWrapper),
  decompress(dataWrapperBeforeDecompress, dataWrapperAfterDecompress)
]);

// 如果消息体的长度大于 limitedLen，则会将消息进行 lzma 压缩
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

用于解析前端的 `url` 的 `API`

```js
import {
  toBase64Str, fromBase64Str,
  getUrlParams, searchUrlParams, urlParamsToQuery, openWindowUseHashUrl,
  resolveUrl, decodeHashUrl
} from '@mini-code/request/url-resolve';
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
