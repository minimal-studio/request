## matrix request helper
主要的请求封装函数，包含加密和压缩算法

#### 说明
##### 统一 request 和测速的入口

- request.js     请求函数
- NetworkResSpeedTesterClass.js 测速函数
- url_hash_helper.js 打开 hash window 的函数

#### 用法

```
import {
  onRequest, NetworkResSpeedTesterClass, getSpeedColl,
  decodeHashUrl, wrapReqHashUrl, openWindowUseHashUrl
} from 'orion-request';

或者

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

#### TODO
- 完善 testing 单元测试，需要把所有功能都认真测试一遍
