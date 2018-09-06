# 引用方式

1. 全部引用

```js
import {
  $request, RequestClass, PollClass,
  GateResSpeedTesterClass,
  decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl,
  getUrlParams, searchUrlParams, toBase64Str, fromBase64Str
} from 'uke-request';
```

2. 局部引用

```js
/**
 * main request helper
 */
import { $request } from 'uke-request/request.js';

/**
 * simple GateResSpeedTesterClass component
 */
import { GateResSpeedTesterClass, getSpeedColl } from 'uke-request/network-res-speed-tester.js';

/**
 * 用于把 request 的 header base64 ，并且通过 window open 的方式打开，同时提供获取对应的路由的解密函数
 */
import { decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl } from 'uke-request/url-hash-helper.js';

let windowTargetObj = openWindowUseHashUrl(url, windowParamStr);
let resultStr = decodeHashUrl();
let wrapReqHashUrlStr = wrapReqHashUrl(url);
```
