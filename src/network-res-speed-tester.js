/*
 * 网络测速
 */

import { $request } from './request';
import {
  CallFunc, DebounceClass, IsUrl, Random, EventEmitterClass,
  IsFunc
} from 'basic-helper';

class GateResSpeedTesterClass extends EventEmitterClass {
  constructor() {
    super();
    
    this.delayExec = new DebounceClass();
    /**
     * 用于存储测速后的结果集
     * 每次测速都会把结果写入，所以会有多次记录
     */
    this.testResult = [];
    this.targetURLS = [];
    this.testRes = {};
    this.suffix = '';
    this.fastestTime = 1000;
    this.fastestIdx = -1;
  }
  getTestResult() {
    return this.testResult;
  }
  resetParams() {
    this.fastestTime = 1000;
    this.fastestIdx = -1;
  }
  test = () => {
    if(!this.checkConfig()) return;
    this.resetParams();
    this.testResult = [];

    let tempIdx = 0;
    function loopReq(idx) {
      let originUrl = this.targetURLS[idx];
      let gate = originUrl + this.suffix;
      this._request.call(this, gate, originUrl, idx);
      let nextIdx = idx += 1;
      if(nextIdx >= this.targetURLS.length) return;
      setTimeout(() => {
        loopReq.call(this, nextIdx);
      }, 200);
    }
    loopReq.call(this, tempIdx);

    return this;
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
  _request = async (url, originUrl, idx) => {
    let startTime = Date.now();

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
    this.delayExec.exec(() => {
      const delayResult = {testRes: this.testRes, fastestIdx: this.fastestIdx};
      CallFunc(this.onRes)(delayResult);
      this.emit('res', delayResult);
      this.testResult.push(delayResult);
      window.localStorage.setItem('FASTEST_GATE', this.targetURLS[this.fastestIdx]);
      if(this.testResult.length === this.targetURLS.length) {
        // test finished
        CallFunc(this.onEnd)(delayResult);
        this.emit('end', delayResult);
      }
    }, 100);
  }
}

export {
  GateResSpeedTesterClass
};