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
import {
  resolveUrl, urlParamsToQuery,
  ParamEntity
} from './url-resolve';

export interface RequestConfig {
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
  middleWares: Function[];
}

export type RequestMethod = 'POST' | 'GET' | 'DELETE' | 'PUT' | 'PATCH';
export type RequestSendTypes = 'json' | 'html';

export interface RequestParams {
  url: string;
  method?: RequestMethod;
  sendType?: RequestSendTypes;
  data: {};
  headers?: {};
  params?: ParamEntity;
  returnRaw?: boolean;
  onError?: Function;
}

export interface FetchOptions extends RequestInit {

}

const canSetFields = [
  'compressLenLimit', 'baseUrl', 'timeout', 'compress',
  'reconnectTime', 'wallet', 'commonHeaders'
];

const headersMapper = {
  json: { 'Content-Type': 'application/json; charset=utf-8' },
  html: { 'Content-Type': 'text/html' }
};

function getContentType(res: Response) {
  return res.headers.get("content-type");
}

function isResJson(res: Response) {
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
 * Uke Request 请求对象的构造类
 *
 * @class RequestClass
 * @extends {EventEmitterClass}
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
  commonHeaders: {};

  baseUrl: string;

  constructor(config?: RequestConfig) {
    super();
    const defaultConfig: RequestConfig = {
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
      middleWares: []
    };

    this.reqStructure = {
      route: '/',
      data: {},
      isCompress: false
    };

    Object.assign(this, defaultConfig, this.setConfig(config));

    this.resPipe(this._setResDataHook());
  }

  use(middleWare: Function) {

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
  urlFilter = (path: string, params?: ParamEntity) => {
    if (/https?/.test(path) || /^(\/\/)/.test(path)) return path;
    let url = this.baseUrl;
    if (!url) {
      console.log('set $request.setConfig({baseUrl: url}) first');
      return '';
    }
    url = resolveUrl(url, path);
    if (params) {
      url = urlParamsToQuery({
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
  upload = (path: string, data: RequestInit["body"]) => {
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
  async get(url: string | {}, options: RequestParams) {
    const isStringUrl = typeof url === 'string';
    const reqConfig = Object.assign({}, {
      method: 'GET',
      url,
      ...options
    }, isStringUrl ? {
      url
    } : url);

    return this.request(reqConfig);
  }

  /**
   * 请求对象生成器
   *
   * @param {string} method String
   * @returns {promise} 生产的函数
   * @memberof RequestClass
   */
  _reqFactory(method: RequestMethod) {
    return (url: string, data: {} | string, options = {}) => this.request(Object.assign(options, {
      url, data, method
    }));
  }

  /**
   * 可以被重写的状态判断函数
   *
   * @returns {boolean}
   * @memberof RequestClass
   */
  checkStatus = () => true

  /**
   * 底层请求接口，GET POST DELETE PATCH 的实际接口
   *
   * @param {RequestParams} options
   * @returns {promise} 返回请求的 promise 对象
   */
  async request(requestParams: RequestParams) {
    const {
      url, data, headers, method = 'POST', params,
      sendType = 'json',
      returnRaw = false, onError = this.onErr,
      ...other
    } = requestParams;
    const _url = this.urlFilter(url, params);
    const isGet = method === 'GET';
    const sendJSON = sendType === 'json';
    const _headers = !sendJSON ? headersMapper.html : headersMapper.json;

    let body;
    if (isGet) {
      body = null;
    } else {
      body = sendJSON ? data : JSON.stringify(data);
    }
    const fetchOptions: FetchOptions = Object.assign({}, {
      method,
      headers: Object.assign({}, _headers, this.commonHeaders, headers),
      ...other
    }, {
      body
    });

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

      /** 执行 resPipe 的时机 */
      if (typeof resData !== 'string') {
        resData = this.execPipeQueue({ ...resData }, this.resPipeQueue);
      }

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
        return returnRaw ? checkInfo : checkInfo.data;
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

    return returnRaw ? result : result.data;
  }
}
const $request = new RequestClass();

export {
  $request, RequestClass
};
