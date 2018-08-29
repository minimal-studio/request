# Orion Request

## 拥有的能力

- 消息压缩，使用 lzma 压缩算法
- 消息加密，使用 RC4 加密算法
- 域名测速器
- 浏览器域名的解析器，包括 hash base64 转码解码
- 简易轮询辅助函数

## 引用方式

```js
import {
  $request, OrionRequestClass, PollClass,
  GateResSpeedTesterClass,
  decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl,
  getUrlParams, searchUrlParams, toBase64Str, fromBase64Str
} from 'orion-request';
```

独立引用

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
gateResSpeedTester.onEnd = (result) => {
  // result 的结构
  result = {
    fastestIdx: numb,
    testRes: {
      [idx]: url
    }
  }
};
gateResSpeedTester.onRes = () => {};
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
let windowParams = '作为 window.open 的第三个参数，详情参考 w3school'
openWindowUseHashUrl(urlParamsConfig, windowParams);
// 会把 urlParamsConfig 对应的字段转码成 base64，然后打开一个新的窗口二，路由如下
// https://ss.com?id=MQ==&req=eyJzZXNzSUQiOjEyMywidXNlcm5hbWUiOiJhbGV4In0=&

// 在此应用二，使用 decodeHashUrl 可以解码路由，获取对应的参数
// 在新打开的应用二
/**
 * 参数说明
 * decodeHashUrl(searchStr, isParseToObject);
 */
let id = decodeHashUrl('id');
let req = decodeHashUrl('req', true);
```

### 使用内建的 $request 对象与服务端进行数据交互

1. 通过请求发起前的 hook 函数，包装出符合对应服务器的请求体结构 「request entity」
2. 包装发送请求对象

```js
import { $request, OrionRequestClass } from 'orion-request';

/**
 *  $request 为内建对象，构造于 OrionRequestClass
 *  $request = new OrionRequestClass()
 */

/**
 * $request send data 前的 wrapper 函数
 * 此函数在 $request.send 前执行，用于发送最终的结构提
 */
$request.wrapDataBeforeSend = (options) => {
  // options 为内部处理完成的结构，包含以下参数
  const {isCompress, method, data, params} = options;
  return {
    Header: Object.assign({}, getCommonHeader(data), {
      Compress: isCompress ? 1 : 0,
      Method: method,
    }, params),
    Data: data
  }
}

// 内部的请求结构，与服务器无关
let sendWrapper = {
  // sendData为必填项
  sendData: {
    method: '',
    data: {},
    params: {
      UserName: data.UserName // 内嵌到 header 中
    },
  },
  // 以下为可填项
  wallet: [], // 针对此次请求的加密 key 数组，一般是通过 chatCodeAt 将 key 变换得出
  onRes: () => {
    // 对应的请求的响应回调
    console.log('on response')
  },
  onErr: () => {
    // 网络请求错误的回调
    console.log('网络请求错误的回调')
  },
}

/**
 * 根据上述 wrapDataBeforeSend 定义，在 send 前，会通过 wrapDataBeforeSend 把结构转化为
 * let finalReqData = {
 *   Header: {
 *     Method: ''
 *   },
 *   Data: {}
 * }
 */
$request.send(sendWrapper);
```

## 处理 response

```js
// 定义 handleRes 的事件，根据具体业务，定制以下处理方式
function handleRes({resData, callback}) {
  let errcode = resData.Header.ErrCode;
  switch (errcode.Code) {
    case '30003':
      // 处理特定的业务码
      break;
  }
}
/**
 * 订阅 $request 每一个 response 事件
 */
$request.subscribeRes(handleRes);

// 统一处理网络错误
$request.onErr = () => {
  console.log('处理统一的网络请求错误，即 network state != 200')
}

/**
 * 订阅网络错误
 * 由于有自动重连的机制，重连成功或者失败，都会广播 CHANGE_NETWORK_STATUS 事件
 */
$GH.EventEmitter.subscribe('CHANGE_NETWORK_STATUS', ({state}) => {
  console.log(state);
});
```

### $request 处理具体对应业务的 req 和 res 的配置例子

一般定义在 ./src/config/req-filter.js 中

```js
/**
 * 如果是通过 hash URL 的项目
 */
import {$request, decodeHashUrl} from 'orion-request';

/** 第一个参数为需要解析的参数名称，第二个为是否把他序列化为对象
 * 结构
 * hashSearched = {
    reqUrl: '',
    SessId: '',
    UserName: '',
    Platform: '',
    Device: '',
    __none: ''
  }
 */
let hashSearched = decodeHashUrl('req', true);

/**
 * 设置必须的配置
 */
$request.setRequestConfig({
  reqUrl: hashSearched.reqUrl || reqUrl,
  wallet: hashSearched.__none || window.__none // 这个为隐秘的加密 key array
});

/**
 * 设置 $request 对象的 res，处理具体业务
 */
function handleRes({resData, callback}) {
  let errcode = resData.Header.ErrCode;
  switch (errcode.Code) {
    case '30003':
    case '30024':
    case '30039':
      onLoginFail();
      break;
  }
  callback(resData);
}

// 统一处理错误请求
$request.onErr = () => {
  console.log('处理统一的网络请求错误，即 network state != 200')
}

/**
 * $request send data 前的 wrapper 函数
 */
$request.wrapDataBeforeSend = (options) => {
  const {isCompress, method, data, params} = options;
  return {
    Header: Object.assign({}, getCommonHeader(), {
      Compress: isCompress ? 1 : 0,
      Method: method,
    }, params),
    Data: data
  }
}

/**
 * 当 $request 有相应时，返回
 */
$request.resDataFilter = (resData) => {
  resData.data = resData.Data;
  return resData;
}

/**
 * 监听 $request res 处理函数
 */
$request.subscribeRes(handleRes);

export {
  $request
}
```

重新构建请求对象

```js
import {OrionRequestClass} from 'orion-request';
const $request = new OrionRequestClass();
```

## TODO

- 完善测试用例
