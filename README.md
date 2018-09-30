# Uke Request

[![Build Status](https://travis-ci.com/SANGET/uke-request.svg?branch=master)](https://travis-ci.com/SANGET/uke-request)
[![install size](https://packagephobia.now.sh/badge?p=uke-request)](https://packagephobia.now.sh/result?p=uke-request)

基于 window.fetch 的拓展封装库, 基于异步事件监听机制

## 提供的能力

- 消息压缩
- 消息加密
- 域名测速器
- 浏览器域名的解析器，hash base64 转码解码
- 简易轮询机制
- [引用方式](./docs/import-desc.md)

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

// post, 此方法只返回 res.data, 如果想要详情，可以订阅事件 onRes, 获取更多细节
let res = await $R.post({
  url: '/item-list',
  headers: {},
  data: {},
});

// 订阅 res 详细相应
$R.on('onRes', (resDetail) => {
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