# 1.2.*

- export matrixRequest 对象，是一个类库，可以通过 new 的方式创造单独运行的 object
- 新增 api setRequestConfig，设置对于的 reqUel，加密 key，压缩限制
- 新增 send api, 用于取代旧的 gameGate api，具体是传入 object 作为参数，更清晰明确
- 请求回调不在处理业务，请设置对应的业务回调处理 onRes 或者 onErr
- 提供默认的符合 matrix 的请求格式，也可以通过 wrapPostData api 来生成想要的格式
- onRequest 改名为 Request
