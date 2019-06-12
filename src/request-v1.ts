/**
 * Lib: Uke Request
 * Author: Alex
 * Desc:
 * 轻松实现以下功能
 *
 * 1. 消息体加|解密
 * 2. 消息体压|解缩
 * 3. RESTFul 数据封装
 * 4. 封装每次请求的 abort 操作
 */

import 'whatwg-fetch';

import {
  CallFunc, IsFunc, HasValue, EventEmitterClass, IsObj
} from 'basic-helper';
import { compressFilter, decompressFilter } from './request-middleware/compress-helper';
import { encryptFilter, decryptFilter } from './request-middleware/encrypt-helper';
import { resolveUrl, wrapReqHashUrl } from './url-resolve';

const canSetFields = [
  'compressLenLimit', 'baseUrl', 'timeout', 'compress',
  'reconnectTime', 'wallet', 'commonHeaders'
];

const headersMapper = {
  js: { 'Content-Type': 'application/json; charset=utf-8' },
  html: { 'Content-Type': 'text/html' }
};

async function getCompressAndEnctyptDataAsync({
  targetData = {}, originData, compressLenLimit,
  beforeEncryptHook, wallet, compress
}) {
  /**
   * wrap send data step
   * 1. 压缩 filter
   * 2. 加密 filter
   */
  const compressedData = compress ? await compressFilter({
    data: targetData,
    compressLenLimit,
  }) : {
    data: targetData
  };
  const runningData = Object.assign({}, originData, compressedData);
  // do encrypt filter before send, get the wrap data from outside setting.
  const wrapedData = beforeEncryptHook(runningData);
  const encryptDataResult = encryptFilter({
    data: wrapedData,
    wallet,
  });

  return encryptDataResult;
}

declare global {
  interface Window {
    decryptFilter: Function;
    decompressFilter: Function;
  }
}

if (process.env.NODE_ENV === 'development') {
  window.decryptFilter = decryptFilter;
  window.decompressFilter = decompressFilter;
}

function getContentType(res) {
  return res.headers.get("content-type");
}

function isResJson(res) {
  return /json/.test(getContentType(res));
}

/**
 * 私有的检查状态函数
 *
 * @param {object} fetchRes
 * @returns {boolean}
 * @private
 */
function _checkStatus(fetchRes) {
  return this.checkStatus(fetchRes);
}

/**
 * 生命周期函数，在发送请求前调用
 *
 * @param {object} targetData 发送的数据
 * @returns targetData
 * @memberof RequestClass
 * @private
 */
function _wrapDataBeforeSend(targetData) {
  if (!this.wrapDataBeforeSend) return targetData;
  /**
   * [wrapDataBeforeSend 可以重写的方法，以下是默认的方式]
   */
  if (IsFunc(this.wrapDataBeforeSend)) return this.wrapDataBeforeSend(targetData);
  return targetData;
}

interface RequestConfig {
  baseUrl: string;
  compressLenLimit: number;
  compress: false;
  reconnectedCount: number;
  reconnectTime: number;
  connectState: string;
  wallet: string;
  commonHeaders: {};
  timeout: number;
  resMark: string;
  errMark: string;
  resPipeQueue: [];
  reqPipeQueue: [];
}

/**
 * Uke Request 请求对象的构造类
 *
 * @class RequestClass
 * @extends {EventEmitterClass}
 *
 * @example
 *
 * import { $request } from 'uke-request';
 *
 * $request.get(url, {
 *   params: {
 *     ID: 123
 *   }
 * })
 */
class RequestClass extends EventEmitterClass {
  defaultConfig: RequestConfig;

  constructor(config?: RequestConfig) {
    super();
    this.defaultConfig = {
      baseUrl: '',
      compressLenLimit: 2048,
      compress: false,
      reconnectedCount: 0, // 记录连接状态
      reconnectTime: 30, // 重连次数, 默认重连五次, 五次都失败将调用
      connectState: 'ok',
      wallet: '',
      commonHeaders: {},
      timeout: 10 * 1000,
      resMark: 'onRes',
      errMark: 'onErr',
      resPipeQueue: [],
      reqPipeQueue: [],
    };

    this.reqStructure = {
      route: '/',
      data: {},
      isCompress: false
    };

    // this.eventEmitter = new EventEmitterClass();

    Object.assign(this, this.defaultConfig, this.setConfig(config));

    // this.post = this._reqFactory('POST');
    // this.put = this._reqFactory('PUT');
    // this.del = this._reqFactory('DELETE');
    // this.patch = this._reqFactory('PATCH');

    this.resPipe(this._setResDataHook());
  }

  execPipeQueue(targetData, targetQueue) {
    if (!targetQueue || !IsObj(targetData)) return targetData;
    let resData = { ...targetData };
    for (const pipeFunc of targetQueue) {
      if (!IsFunc(pipeFunc)) continue;
      resData = pipeFunc(resData);
    }
    return resData;
  }

  /**
   * 设置请求对象的配置
   *
   * @param {object} config {'compressLenLimit', 'baseUrl', 'timeout', 'reconnectTime', 'wallet', 'commonHeaders'}
   * @returns {void}
   * @memberof RequestClass
   */
  setConfig = (config) => {
    if (!config) return {};
    /**
     * 避免被设置其他字段
     */
    Object.keys(config).forEach((configKey) => {
      if (canSetFields.indexOf(configKey) != -1) {
        this[configKey] = config[configKey];
      }
    });
  }

  /**
   * 用于广播 response 事件
   *
   * @param {object} res request 返回的 res 对象
   * @memberof RequestClass
   */
  onRes = (res) => {
    // 获取完整的 res 对象
    this.emit(this.resMark, res);
  }

  resPipe(pipeFunc) {
    this._pipe(pipeFunc, this.resPipeQueue);
  }

  reqPipe(pipeFunc) {
    this._pipe(pipeFunc, this.reqPipeQueue);
  }

  _pipe(pipeFunc, targetQueue) {
    if (IsFunc(pipeFunc)) {
      targetQueue.push(pipeFunc);
    } else {
      // console.warn('pipeFunc need to be a function')
    }
  }

  /**
   * 用于广播 error 事件
   *
   * @param {object} res request 返回的 res 对象
   * @memberof RequestClass
   */
  onErr = (res) => {
    // 广播消息错误
    this.emit(this.errMark, res);
  }

  /**
   * 请求生命周期函数，在 res return 之前调用
   *
   * @param {object} resData
   * @returns 外部调用，改变内部数据
   * @memberof RequestClass
   */
  _setResDataHook() {
    // 可以重写，用于做 resData 的业务处理
    // console.log('set [$request.setResDataHook = func] first');
    if (this.setResDataHook) {
      // console.warn('setResDataHook 要被废弃了，请使用新接口 resPipe()');
      return resData => this.setResDataHook(resData);
    }
    // return resData;
  }

  /**
   * 解析 url, 可以封装
   *
   * @param {string} path 路由
   * @param {object} params 参数
   * @returns {string}
   * @memberof RequestClass
   */
  urlFilter = (path, params) => {
    if (/https?/.test(path) || /^(\/\/)/.test(path)) return path;
    let url = this.baseUrl;
    if (!url) return console.log('set $request.setConfig({baseUrl: url}) first');
    url = resolveUrl(url, path);
    if (params) {
      url = wrapReqHashUrl({
        url,
        params,
        toBase64: false
      });
    }
    return url;
  }

  /**
   * 上传接口
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {void}
   * @memberof RequestClass
   */
  upload = (path, data) => {
    const _url = this.urlFilter(path);
    return fetch(_url, {
      method: 'POST',
      body: data,
      // headers: uploadHeader,
    });
  }

  /**
   * 发送 POST 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  post = this._reqFactory('POST');

  /**
   * 发送 PUT 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  put = this._reqFactory('PUT');

  /**
   * 发送 DELETE 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  del = this._reqFactory('DELETE');

  /**
   * 发送 PATCH 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  patch = this._reqFactory('PATCH');

  /**
   * 发送 Get 请求
   *
   * @param {object | string} url URL 字符串或者配置
   * @param {object} options 配置
   * @returns  {promise}
   * @memberof RequestClass
   */
  async get(url, options) {
    const isStringUrl = typeof url === 'string';
    const reqConfig = isStringUrl ? {
      method: 'GET',
      url,
      ...options
    } : {
      ...url,
      ...options,
      method: 'GET',
    };

    return this.request(reqConfig);
  }

  /**
   * 请求对象生成器
   *
   * @param {string} method String
   * @returns {promise} 生产的函数
   * @memberof RequestClass
   */
  _reqFactory(method) {
    return (url, data, options = {}) => this.request(Object.assign(options, {
      url, data, method
    }));
  }

  /**
   * 可以被重写的状态判断函数
   *
   * @returns {boolean}
   * @memberof RequestClass
   */
  checkStatus() {
    return true;
  }

  /**
   * 底层请求接口，GET POST DELETE PATCH 的实际接口
   *
   * @param {object} options {
   *     url, data, headers, method = 'POST', params, returnAll = false, onError = function(e){console.log(e)}, ...other
   *   }
   * @returns {promise} 返回请求的 promise 对象
   * @memberof RequestClass
   */
  async request({
    url, data, headers, method = 'POST', params,
    // compress = this.compress,
    // compressLenLimit = this.compressLenLimit,
    // pipeBeforeData,
    // wallet = this.wallet,
    isEncrypt,
    returnAll = false, onError = this.onErr,
    ...other
  }) {
    const _url = this.urlFilter(url, params);
    const isGet = method === 'GET';
    isEncrypt = isEncrypt && !isGet;
    const _headers = isEncrypt ? headersMapper.html : headersMapper.js;

    // if(!isGet) {
    //   /** 如果需要压缩 */
    //   const compressedData = await compressFilter({ data, compressLenLimit, compress });

    //   /** 合并 pipeBeforeData 到 data 中 */
    //   const middleData = Object.assign({}, pipeBeforeData || data, compressedData);

    //   /** 调用 pipeBefore 的时机 */
    //   const pipedData = execPipeQueue.call(this, middleData, this.reqPipeQueue);

    //   /** 如果需要加密 */
    //   data = wallet ? encryptFilter({ data: pipedData, wallet }) : data;
    // }

    const body = method === 'GET' ? {} : {
      body: isEncrypt ? data : JSON.stringify(data)
    };

    const fetchOptions = {
      method,
      headers: Object.assign({}, _headers, this.commonHeaders, headers),
      ...body,
      ...other
    };

    const result = {};

    try {
      /** 1. 尝试发送远端请求, 并解析结果 */
      const fetchRes = await fetch(_url, fetchOptions);

      const isJsonRes = isResJson(fetchRes);

      let resData = {};

      try {
        resData = await (isJsonRes ? fetchRes.json() : fetchRes.text());
      } catch (e) {
        onError(e);
      }

      /** 如果有加密，尝试解密 */
      // if(isEncrypt) {
      //   resData = decryptFilter({ data: resData, wallet });
      // }

      /** 执行 resPipe 的时机 */
      if (typeof resData !== 'string') resData = this.execPipeQueue({ ...resData }, this.resPipeQueue);

      Object.assign(result, {
        data: resData,
        originRes: fetchRes,
        originReq: fetchOptions
      });

      /** 2. 尝试对远端的 res 进行 status 判定 */
      const isPass = _checkStatus.call(this, fetchRes);

      /** 3. 如果不成功，则返回包装过的信息 */
      if (!isPass) {
        const checkInfo = {
          ...result,
          err: 'checkStatus false.',
        };
        onError(checkInfo);
        return returnAll ? checkInfo : checkInfo.data;
      }

      this.onRes(result);
    } catch (e) {
      /** 如果有传入 onError，则不广播全局的 onErr 事件 */
      // IsFunc(onError) ? onError(e) : this.onErr(e);
      onError(e);

      Object.assign(result, {
        data: null,
        err: e
      });
    }

    return returnAll ? result : result.data;
  }

  /**
   * 广播网络状态改变消息
   *
   * @param {string} state 消息状态
   * @returns {void}
   * @memberof RequestClass
   */
  changeNetworkState(state) {
    if (state == this.connectState) return;
    this.emit('CHANGE_NETWORK_STATUS', {
      state
    });
    this.connectState = state;
  }
  /**
   * 尝试断线重连
   *
   * @returns {void}
   * @memberof RequestClass
   */
  // reconnect() {
  //   this.changeNetworkState('tryToConnecting');

  //   if(this.timer) clearTimeout(this.timer);
  //   if(this.reconnectedCount > this.reconnectTime) {
  //     this.changeNetworkState('fail');
  //     return this.onErr();
  //   }
  //   if(this.reconnectedCount == 15) {
  //     this.changeNetworkState('reconnecting');
  //   }

  //   this.reconnectedCount++;
  // }
  /**
   * 订成发送数据接口, 封装了通讯加密和压缩功能
   *
   * @param {object} options {sendData, url, path, wallet = this.wallet, method = 'POST', headers, onErr}
   * @returns {promise}
   * @memberof RequestClass
   */
  async send({
    sendData, url, path, wallet = this.wallet, compress = this.compress,
    compressLenLimit = this.compressLenLimit,
    method = 'POST', headers, onErr = this.onErr
  }) {
    const sendDataFilterResult = await getCompressAndEnctyptDataAsync({
      targetData: sendData.data || sendData.Data,
      originData: sendData,
      compress,
      compressLenLimit,
      beforeEncryptHook: _wrapDataBeforeSend.bind(this),
      wallet
    });

    const postResData = await this.request({
      url: url || path,
      data: sendDataFilterResult,
      // data: sendData.data || sendData.Data,
      // pipeBeforeData: sendData,
      isEncrypt: !!wallet,
      wallet,
      compress,
      method,
      headers
    });

    if (HasValue(postResData)) {
      const _dataFilterRes = decryptFilter({ data: postResData, wallet });
      const dataFilterRes = this._setResDataHook()(_dataFilterRes);

      if (HasValue(dataFilterRes.data)) {
        this.changeNetworkState('ok');
        const decomResData = dataFilterRes.isCompress ? await decompressFilter(dataFilterRes.data) : dataFilterRes.data;
        dataFilterRes.data = dataFilterRes.Data = decomResData;
      } else {
        console.log('need set data for res data');
      }

      return dataFilterRes;
    }
    // this.reconnect('not res data.');

    CallFunc(onErr)('not res data.');

    return false;
  }
}
const $request = new RequestClass();

export {
  $request, RequestClass
};
