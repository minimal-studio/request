# @mini-code/request 其他模块

## 测速器

```js
import { GateResSpeedTesterClass } from '@mini-code/request/network-res-speed-tester'

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

## 数据加密

```js
```

TODO: 完善说明

## 数据压缩

TODO: 完善说明
