# Uke Request

基于 fetch api 的异步请求封装库, 基于异步事件监听机制、中间件机制。

[![Build Status](https://travis-ci.com/SANGET/uke-request.svg?branch=master)](https://travis-ci.com/SANGET/uke-request)
[![install size](https://packagephobia.now.sh/badge?p=uke-request)](https://packagephobia.now.sh/result?p=uke-request)

- [在线文档](https://request.ukelli.com/)

## 提供的能力

- 消息压缩
- 消息加密
- 域名测速器
- 浏览器域名的解析器，hash base64 转码解码
- 简易轮询机制
- [引用方式](./docs/import-desc.md)

## 请求处理流程

Uke request 对于请求发起的内部运作流程，以及 data 过滤器的生命周期说明

```js
// 此顶层调用会执行以下过滤器和钩子函数，最终得到 res
const res = await $request.get(params);
```

1. 发起顶层调用 get, [ post del put post patch send 同理 ]
2. 统一通过 $request.request 处理
3. 通过一些处理请求的生命周期 parseRes 函数
    1. 通过 resPipe 注册的链式过滤返回数据
        - 通过 $request.resPipe((resData) => { resData.customer = {}; return resData }) 注册，有先后顺序
    2. checkStatus 自定义检查 status 状态方式
        - if false, 触发 onErr
4. end 请求结束，返回 res

Send 通讯加密和压缩计算

1. TODO

## 使用

### 使用方式

RESTFul

```js
import { RequestClass } from 'uke-request';
let $R = new RequestClass();

// 可以为每一个请求对象设置配置
$R.setConfig({
  baseUrl: 'https://example.com', // 默认的地址，
  timeout: 10 * 1000,
  compressLenLimit: 2048, // 消息体压缩长度
  reconnectTime: 30, // 重连次数
  wallet: '123', // 密钥
  commonHeaders: {} // 所有的请求 headers
});

// get, 使用 params 自动转换成对应的 url
let res = await $R.get('/item-list', options);
let res = await $R.get({
  url: '/item-list',
  headers: {},
  params: {
    id: 123,
    other: 321
  },
  isBase64: false // 用于加密 params 的值
});

// params 会作为 url 的 query 形式解析
const options = {
  params: {
    ID: '123'
  },
  onError: () => {} // 每一个消息都可以做独立的错误处理，如果有此参数，则不会触发 $R.on('onErr') 的订阅事件
}

// 统一的检查 res status 的状态，如果 return false，则触发 onErr
$R.checkStatus = (originRes) => {
  return true;
}

// post, 此方法只返回 res.data, 如果想要详情，可以订阅事件 onRes, 获取更多细节
let postRes = await $R.post('/item-list', data, options);
let patchRes = await $R.patch('/item-list', data, options);
let delRes = await $R.del('/item-list', data, options);
let putRes = await $R.put('/item-list', data, options);

// 通过 pipe 注册过滤器
$R.resPipe((data) => {
  data.test = true;
  return data;
});

// 最后会以 host/item-list?ID=123 形式发送请求

// 订阅 res 详细相应
$R.on('onRes', (resDetail) => {
  resDetail = {
    data: {},
    originRes: {},
    originReq: {},
  }
});

// 统一的 err 详细相应
$R.on('onErr', (resDetail) => {
  resDetail = {
    data: {},
    originRes: {},
    originReq: {},
  }
});
```

request 函数

```js
// 其他方式, options 同 fetch api，sendData 如果是 js，将自动做 header 对应的转换
let res = await $R.request({
  url, data, headers, method = 'POST',
  isEncrypt = false,
  resolveRes = true,
  returnAll = false, // 是否返回完整的 res 状态 return returnAll ? res : res.data
  ...other
});
```

消息体加密和消息压缩功能，请使用 $R.send

```js
let sendConfig = {
  sendData: {
    data: {}
    other: {}
  },
  path: 'test',
  onErr: () => {},
  wallet: 'hahaha'
}

// 加密了 sendConfig.sendData 中的数据, 增加破解协议的成本
let res = await $R.send(sendConfig);
```

- [其他模块说明](./docs/other-desc.md)
