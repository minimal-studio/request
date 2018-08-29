# Orion Request

## 能力

- 消息压缩
- 消息加密

## 引用方式

```js
import {
  onRequest, NetworkResSpeedTesterClass, getSpeedColl,
  decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl
} from 'orion-request';

/**
 * main request helper
 */
import onRequest from 'orion-request/request.js';

/**
 * simple NetworkResSpeedTesterClass component
 */
import {NetworkResSpeedTesterClass, getSpeedColl} from 'orion-request/network-res-speed-tester.js';

/**
 * 用于把 request 的 header base64 ，并且通过 window open 的方式打开，同时提供获取对应的路由的解密函数
 */
import {decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl} from 'orion-request/url_hash_helper.js';

let windowTargetObj = openWindowUseHashUrl(url, windowParamStr);
let resultStr = decodeHashUrl();
let wrapReqHashUrlStr = wrapReqHashUrl(url);
```

## 使用内建的 $request 对象发送请求

1. 通过请求发起前的 hook 函数，包装出符合对应服务器的请求体结构 「request entity」
2. 包装发送请求对象

```js
import {OrionRequestClass} from 'orion-request';

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
    case '30024':
    case '30039':
      // TODO 处理登录错误的业务
      break;
  }
}
/**
 * 订阅 $request response 事件
 */
$request.subscribeRes(handleRes);
```

## 统一处理网络错误

```js
// 通用做法
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

## $request 处理具体对应业务的 req 和 res 的配置例子

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
