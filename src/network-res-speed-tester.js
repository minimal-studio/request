/*
 * 网络测速
 */

import {$request} from './request';
import {CallFunc, DebounceClass, IsUrl, Random, EventEmitterClass} from 'basic-helper';

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
    this.resMark = 'ON_REQ_RES';
    this.resDoneMark = 'ON_REQ_DONE_RES';
    this.fastestTime = 1000;
    this.fastestIdx = -1;

    this.eventEmitter = new EventEmitterClass();
  }
  getTestResult() {
    return this.testResult;
  }
  // subscribeRes(func) {
  //   this.eventEmitter.subscribe(this.resMark, func);
  // }
  // unsubscribeRes(func) {
  //   this.eventEmitter.unsubscribe(this.resMark, func);
  // }
  // subscribeResDone(func) {
  //   this.eventEmitter.subscribe(this.resDoneMark, func);
  // }
  // unsubscribeResDone(func) {
  //   this.eventEmitter.unsubscribe(this.resDoneMark, func);
  // }
  resetParams() {
    this.fastestTime = 1000;
    this.fastestIdx = -1;
  }
  test() {
    if(!this.checkConfig()) return;
    this.resetParams();
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

    let isSuccess = await $request.get(url);
    let endTime = Date.now() - startTime;

    if(!isSuccess) {
      endTime = -1;
    } else if (endTime < this.fastestTime) {
      this.fastestTime = endTime;
      this.fastestIdx = idx;
    }
    this.testRes[idx] = {
      url: url,
      originUrl,
      t: endTime
    };
    self.delayExec.exec(() => {
      let delayResult = {testRes: this.testRes, fastestIdx: this.fastestIdx};
      CallFunc(this.onRes)(delayResult);
      self.testResult.push(delayResult);
      window.localStorage.setItem('FASTEST_GATE', self.targetURLS[this.fastestIdx]);
      if(self.testResult.length === self.targetURLS.length) {
        // test finished
        CallFunc(self.onEnd)(delayResult);
      }
    }, 100);
  }
}
