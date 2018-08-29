# Orion Request

## 拥有的能力

- 消息压缩，使用 lzma 压缩算法
- 消息加密，使用 RC4 加密算法
- 域名测速器
- 浏览器域名的解析器，包括 hash base64 转码解码
- 简易轮询辅助函数

## 引用方式

全部引用

```js
import {
  $request, OrionRequestClass, PollClass,
  GateResSpeedTesterClass,
  decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl,
  getUrlParams, searchUrlParams, toBase64Str, fromBase64Str
} from 'orion-request';
```

独立文件引用

```js
/**
 * main request helper
 */
import { $request } from 'orion-request/request.js';

/**
 * simple GateResSpeedTesterClass component
 */
import { GateResSpeedTesterClass, getSpeedColl } from 'orion-request/network-res-speed-tester.js';

/**
 * 用于把 request 的 header base64 ，并且通过 window open 的方式打开，同时提供获取对应的路由的解密函数
 */
import { decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl } from 'orion-request/url-hash-helper.js';

let windowTargetObj = openWindowUseHashUrl(url, windowParamStr);
let resultStr = decodeHashUrl();
let wrapReqHashUrlStr = wrapReqHashUrl(url);
```

## 用法

### 测速器

```js
const gateResSpeedTester = new GateResSpeedTesterClass();

// 测速结束后的 callback
gateResSpeedTester.onEnd = (result) => {
  // result 的结构
  result = {
    fastestIdx: numb,
    testRes: {
      [idx]: url
    }
  }
};

// 每一次条链接测速后的 callback
gateResSpeedTester.onRes = () => {};

// 设置测速
gateResSpeedTester.setConfig({
  gateUrls: [
    'https://url-1.com',
    'https://url-2.com',
    'https://url-3.com',
    'https://url-4.com',
  ],
  suffix: '/sudo'
});

// 开始测速，会逐一把上述定义的 gateUrls 测速，加入后缀 /sudo
gateResSpeedTester.test();
```

### 路由解析器

前后端分离的应用，如果需要打开另一个新的应用，可以通过 url 的方式，把 sessionID 和相关的信息通过路由传递

下面模拟场景，应用一通过 openWindowUseHashUrl 打开应用二

```js
// 应用一
let urlParamsConfig = {
  url: 'https://ss.com',
  params: {
    id: '1',
    req: {
      sessID: 123,
      username: 'alex',
    }
  }
}
let windowParams = '作为 window.open 的第三个参数，详情参考 w3school';
/**
 * 1. 把 urlParamsConfig 对应的字段转码成 base64，然后打开一个新的窗口二，路由如下
 * https://ss.com?id=MQ==&req=eyJzZXNzSUQiOjEyMywidXNlcm5hbWUiOiJhbGV4In0=&
 */
openWindowUseHashUrl(urlParamsConfig, windowParams);

/**
 * 在此应用二，使用 decodeHashUrl 可以解码路由，获取对应的参数
 * decodeHashUrl 参数说明
 * decodeHashUrl(searchStr, isParseToObject);
 */
let id = decodeHashUrl('id');
let req = decodeHashUrl('req', true);
```

### $request 的工作原理以及与服务端交互的过程

外部使用的过程

1. 通过请求发起前的 hook 函数，包装出符合对应服务器的请求体结构 「request entity」
2. 包装发送请求对象
3. 响应并统一处理特定的业务

$request 内部运作流程和原理

1. 审阅请求的内容，是否达到需要压缩的长度，默认是 2048 k
2. 寻找加密的 key，并且做对应的加密处理
3. 发送到指定的远端服务接口
4. 收到远端的回应
5. 解密
6. 解压缩

如果 1 2 5 6 没达到特定的要求，就发送原始结构

详情请参考以下例子

- [详细说明](./docs/demo.md)
- [demo code](./demo-req-filter.js)

## TODO

- 完善测试用例
