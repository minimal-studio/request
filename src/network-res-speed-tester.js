/*
 * 网络测速
 */

import {$request} from './request';
import {CallFunc, DebounceClass, IsUrl, Random} from 'basic-helper';

export class GateResSpeedTesterClass {
  constructor() {
    this.delayExec = new DebounceClass();
    /**
     * 用于存储测速后的结果集
     * 每次测速都会把结果写入，所以会有多次记录
     */
    this.testResult = [];
    this.targetURLS = [];
    this.testRes = {};
    this.suffix = '';
  }
  getTestResult() {
    return this.testResult;
  }
  test() {
    if(!this.checkConfig()) return;
    this.testResult = [];

    let self = this;

    let tempIdx = 0;
    function loopReq(idx) {
      let originUrl = this.targetURLS[idx];
      let gate = originUrl + this.suffix;
      self._request.call(this, gate, originUrl, idx);
      let nextIdx = idx += 1;
      if(nextIdx >= this.targetURLS.length) return;
      setTimeout(() => {
        loopReq.call(this, nextIdx);
      }, 200);
    }
    loopReq.call(this, tempIdx);

    return self;
  }
  setConfig({gateUrls, suffix}) {
    this.targetURLS = gateUrls;
    this.suffix = suffix;
  }
  getFastestGate() {
    return window.localStorage.getItem('FASTEST_GATE') || this.getRandomURL();
  }
  checkConfig() {
    let isPass = false;
    switch (true) {
      case !Array.isArray(this.targetURLS) || this.targetURLS.length == 0:
        console.log('gateUrls should be Array');
        break;
      case !this.targetURLS:
        console.log('call setConfig({gateUrls: []}) first');
        break;
      default:
        isPass = true;
    }
    return isPass;
  }
  getRandomURL() {
    if(!this.checkConfig()) return;
    function _g() {
      return this.targetURLS[Random([0, this.targetURLS.length - 1])];
    }
    let __r = _g.call(this);
    if(!IsUrl(__r)) __r = this.getRandomURL.call(this);
    return __r;
  }
  async _request(url, originUrl, idx) {
    let startTime = Date.now();

    let self = this;
    let fastestIdx = 0;
    let fastestTime = 1000;

    let isSuccess = await $request.get(url);
    let endTime = Date.now() - startTime;

    if(!isSuccess) {
      endTime = -1;
    } else if (endTime < fastestTime){
      fastestTime = endTime;
      fastestIdx = idx;
    }
    this.testRes[idx] = {
      url: url,
      originUrl,
      t: endTime
    };
    self.delayExec.exec(() => {
      let result = {testRes: this.testRes, fastestIdx};
      CallFunc(self.onRes)(result);
      self.testResult.push(result);
      window.localStorage.setItem('FASTEST_GATE', self.targetURLS[fastestIdx]);
      if(Object.keys(this.testRes).length === self.targetURLS.length) {
        // test finished
        CallFunc(self.onEnd)(result);
      }
    }, 300);
  }
}
