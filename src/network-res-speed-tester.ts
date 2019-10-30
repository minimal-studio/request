/*
 * 网络测速
 */

import {
  Call, DebounceClass, IsUrl, Random, EventEmitterClass
} from '@mini-code/base-func';
import { RequestClass } from './request';

const $request = new RequestClass();

interface TestResEntity {
  [idx: number]: {
    url: string;
    originUrl: string;
    t: number;
  };
}

interface TestResultArr {
  testRes?: TestResEntity;
  fastestIdx?: number;
}

/**
 * 域名测速工具的构造器，给予 EventEmitter
 *
 * @class GateResSpeedTesterClass
 * @example
 * const speedTester = new GateResSpeedTesterClass();
 *
 * @extends {EventEmitterClass}
 */
class GateResSpeedTesterClass extends EventEmitterClass {
  delayExec: DebounceClass;

  testRes?: TestResEntity;

  testResult?: TestResultArr[];

  targetURLS?: string[];

  suffix: string;

  fastestTime: number;

  fastestIdx: number;

  onRes: Function;

  onEnd: Function;

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

  /**
   * 获取测速结果
   *
   * @returns {object}
   * @memberof GateResSpeedTesterClass
   */
  getTestResult() {
    return this.testResult;
  }

  /**
   * 重置所有参数
   *
   * @memberof GateResSpeedTesterClass
   */
  resetParams() {
    this.fastestTime = 1000;
    this.fastestIdx = -1;
  }

  /**
   * 测试开始
   *
   * @memberof GateResSpeedTesterClass
   */
  test = () => {
    if (!this.checkConfig()) return this;
    this.resetParams();
    this.testResult = [];

    const tempIdx = 0;
    function loopReq(idx: number) {
      const originUrl = this.targetURLS[idx];
      const gate = originUrl + this.suffix;
      this._request.call(this, gate, originUrl, idx);
      const nextIdx = idx + 1;
      if (nextIdx >= this.targetURLS.length) return;
      setTimeout(() => {
        loopReq.call(this, nextIdx);
      }, 200);
    }
    loopReq.call(this, tempIdx);

    return this;
  }

  /**
   * 设置配置
   *
   * @param {object} config {gateUrls, suffix}
   * @memberof GateResSpeedTesterClass
   */
  setConfig(configs: {
    gateUrls?: string[];
    suffix?: string;
  }) {
    const { gateUrls, suffix } = configs;
    this.targetURLS = gateUrls;
    this.suffix = suffix;
  }

  /**
   * 获取最快的域名的结果
   *
   * @returns {object}
   * @memberof GateResSpeedTesterClass
   */
  getFastestGate() {
    return window.localStorage.getItem('FASTEST_GATE') || this.getRandomURL();
  }

  /**
   * 检查配置是否符合规则
   *
   * @private
   * @returns {boolean}
   * @memberof GateResSpeedTesterClass
   */
  checkConfig() {
    let isPass = false;
    switch (true) {
      case !Array.isArray(this.targetURLS) || this.targetURLS.length === 0:
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

  /**
   * 随机获取一个域名
   *
   * @returns {string}
   * @memberof GateResSpeedTesterClass
   */
  getRandomURL() {
    function _g() {
      return this.targetURLS[Random([0, this.targetURLS.length - 1])];
    }
    if (this.checkConfig()) {
      let __r = _g.call(this);
      if (!IsUrl(__r)) __r = this.getRandomURL.call(this);
      return __r;
    }
    return null;
  }

  /**
   * 发送测速请求
   *
   * @private
   * @memberof GateResSpeedTesterClass
   */
  _request = async (url: string, originUrl: string, idx: number) => {
    const startTime = Date.now();

    const isSuccess = await $request.get(url);
    let endTime = Date.now() - startTime;

    if (!isSuccess) {
      endTime = -1;
    } else if (endTime < this.fastestTime) {
      this.fastestTime = endTime;
      this.fastestIdx = idx;
    }
    this.testRes[idx] = {
      url,
      originUrl,
      t: endTime
    };
    this.delayExec.exec(() => {
      const delayResult = { testRes: this.testRes, fastestIdx: this.fastestIdx };
      Call(this.onRes, delayResult);
      this.emit('res', delayResult);
      this.testResult.push(delayResult);
      window.localStorage.setItem('FASTEST_GATE', this.targetURLS[this.fastestIdx]);
      if (this.testResult.length === this.targetURLS.length) {
        // test finished
        Call(this.onEnd, delayResult);
        this.emit('end', delayResult);
      }
    }, 100);
  }
}

export {
  GateResSpeedTesterClass
};
