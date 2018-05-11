## orion request

提供功能

- 消息压缩
- 消息加密

#### 说明

#### 用法

```
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

#### request 的必须配置例子

```
/**
 * 设置必须的配置
 */
$request.setRequestConfig({
  reqUrl: currReqUrl,
  wallet: window.__none // 这个为隐秘的加密 key array
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
```

#### TODO
- 完善 testing 单元测试，需要把所有功能都认真测试一遍
