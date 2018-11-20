# update logs

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

## 0.11.0

- 优化底层 API，支持 RESTFul 调用
- api setRequestConfig 更名为 setConfig
- baseUrl 取代 reqUrl
- 新增 post put del 等 RESTFul API

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
