# Update logs of Uke-request

## 1.0.2

- 调整 getUrlParams 返回类型

## 1.0.1

- `getUrlParams` 新增可以解码 `base64 query url` 的接口

## 1.0.0

更注重基本的通讯功能，其他功能通过中间件形式嵌入。

### 新功能

- 全面支持 typescript

### Break change

> RequestClass

- `RequestClass` 不再与通讯加密和消息解压缩绑定，通过另外的 API 实现
- `RequestClass.setResDataHook` 已废弃，该用 `request.use`
- 清理 `RequestClass` 的配置，不再提供 `reconnect` 机制
- `RequestClass.request` 参数调整 `returnAll -> returnRaw`

> 项目目录调整

- 不再默认导出除了 `request` 和 `url-resolve` 之外的 API，需要通过指定路径引用

### 重新设计的 API

- 重新设计 `RequestClass` 的机制，兼容旧版的 `RESTFul` 模式，同时扩展了中间件 `(Middleware)` 机制处理数据。
- 内置内容加密、内容压缩的中间件 `(Middleware)`

```js
import { RequestClass } from 'uke-request';

const $R = new RequestClass();

/** 中间件 */
const beforeReq = (data) => {
  return data;
};
const afterRes = (data) => {
  return data;
};
/** use 参数 [beforeFn, afterFn] */
$R.use([beforeReq, afterRes]);

$R.get();
$R.post();
$R.del();
$R.put();
$R.patch();

$R.request();
```

### 重命名

- wrapReqHashUrl -> urlParamsToQuery

-------------

## 0.13.8

- 修复 url-resolve 的问题

## 0.13.6

- 修复问题

## 0.13.5

- 升级依赖库

## 0.13.4

- 调整轮询函数的功能

## 0.13.3

- 去除提示

## 0.13.2

- 修复一些问题

## 0.13.1

- 修复压缩过滤的问题

## 0.13.0

- 新增 resPipe API，用于过滤响应

-------------

## 0.12.15

- 优化错误处理机制

## 0.12.14

- 添加每个请求的 onError 处理函数

## 0.12.13

- 调整说明文档
- 调整所有快捷方法的使用，可以传入 params 来确定
- 调整 get 方法的使用

## 0.12.12

- 新增 patch 方法

## 0.12.11

- 修复 url filter 的正则表达式的错误问题

## 0.12.9

- 调整线路测试模块, 新增监听器模式响应 res
- 优化 request 对于 url 解析的策略

升级指引

## 0.12.0

- 重做 res 的结构，符合 RESTFul 标准
- 优化代码，调整接口名字
- 继承 EventEmitter，实现高阶事件监听
- 重做消息 emit 机制，如下

```js
$GH.EventEmitter.subscribe('CHANGE_NETWORK_STATUS', func) // 修改为
$request.on('CHANGE_NETWORK_STATUS', func)
```

-------------

## 0.11.0

- 优化底层 API，支持 RESTFul 调用
- api setRequestConfig 更名为 setConfig
- baseUrl 取代 reqUrl
- 新增 post put del 等 RESTFul API

-------------

> 旧版本 orion-request

## 2.1.9

- 新增一个 searchUrlParams 接口，用于分析网页的参数

## 2.*

全新的结构，完全分离业务的实现

## 1.2.*

- export matrixRequest 对象，是一个类库，可以通过 new 的方式创造单独运行的 object
- 新增 api setRequestConfig，设置对于的 reqUel，加密 key，压缩限制
- 新增 send api, 用于取代旧的 gameGate api，具体是传入 object 作为参数，更清晰明确
- 请求回调不在处理业务，请设置对应的业务回调处理 onRes 或者 onErr
- 提供默认的符合 matrix 的请求格式，也可以通过 wrapPostData api 来生成想要的格式
- onRequest 改名为 Request
