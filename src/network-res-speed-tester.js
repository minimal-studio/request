/*
 * 网络测速
 */

import {$request} from './request';
import {callFunc, DebounceClass, isUrl, random} from 'basic-helper';

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
      let gate = this.targetURLS[idx];
      self._request.call(this, gate, idx);
      let nextIdx = idx += 1;
      if(nextIdx >= this.targetURLS.length) return;
      setTimeout(() => {
        loopReq.call(this, nextIdx);
      }, 200);
    }
    loopReq.call(this, tempIdx);

    return self;
  }
  setConfig({gateUrls}) {
    this.targetURLS = gateUrls;
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
      return this.targetURLS[random([0, this.targetURLS.length - 1])];
    }
    let __r = _g.call(this);
    if(!isUrl(__r)) __r = this.getRandomURL.call(this);
    return __r;
  }
  _request(gate, idx) {
    let url = `${gate}/x`;
    let startTime = Date.now();

    let self = this;
    let fastestIdx = 0;
    let fastestTime = 1000;

    $request.get(url, (res) => {
      let endTime = Date.now() - startTime;
      if(!res || res.status != 200) {
        endTime = -1;
      } else if (endTime < fastestTime){
        fastestTime = endTime;
        fastestIdx = idx;
      }
      this.testRes[idx] = {
        url: url,
        originUrl: gate,
        t: endTime
      };
      self.delayExec.exec(() => {
        let result = {testRes: this.testRes, fastestIdx};
        callFunc(self.onRes)(result);
        self.testResult.push(result);
        window.localStorage.setItem('FASTEST_GATE', self.targetURLS[fastestIdx]);
        if(Object.keys(this.testRes).length === self.targetURLS.length) {
          // test finished
          callFunc(self.onEnd)(result);
        }
      }, 300);
    });
  }
}
