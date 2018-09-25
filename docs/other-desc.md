# UKE request 其他模块

## 测速器

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

## 路由解析器

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

## URL 拼接

```js
import { resolveUrl } from 'uke-request';

resolveUrl('baseUrl', '/params1', 'params2', ...);
// -> baseUrl/params1/params2
```

## 更多详情

- [工作原理以及与服务端交互的过程](./work-principle.md)
- [详细说明](./docs/demo.md)
- [demo code](./demo-req-filter.js)

## 数据加密

TODO: 完善说明

## 数据压缩

TODO: 完善说明

## TODO

- 完善测试用例
