/* eslint-disable no-dupe-class-members */
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
  commonHeaders?: {};
  timeout?: number;
  resMark?: string;
  errMark?: string;
}

export type MiddlewareFunc = (data) => any;

export interface MiddlewareOptions {
  after?: MiddlewareFunc | MiddlewareFunc[];
  before?: MiddlewareFunc | MiddlewareFunc[];
}

export type RequestMethod = 'POST' | 'GET' | 'DELETE' | 'PUT' | 'PATCH';
export type RequestSendTypes = 'json' | 'html';

export interface BaseRequestParams {
  url: string;
  method?: RequestMethod;
  // sendType?: RequestSendTypes;
  data?: {};
  headers?: {};
  params?: ParamEntity;
  returnRaw?: boolean;
  onError?: (event) => void;
}

export interface RequestParams extends BaseRequestParams {
  data: {};
}

export interface RequestResStruct {
  data?: {};
  originRes?: {};
  originReq?: {};
  err?: string;
}
export type RequestRes = RequestResStruct | RequestResStruct['data'];

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

// class EventEmitterClassMore<T> extends EventEmitterClass {
//   this: T
// }
function arrayFilter(arg: any) {
  return Array.isArray(arg) ? arg : [arg];
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
 *
 */
class RequestClass<DefaultResponseType = {}> extends EventEmitterClass {
  config: RequestConfig;

  afterResMiddlewares: MiddlewareFunc[] = [];

  beforeReqMiddlewares: MiddlewareFunc[] = [];

  constructor(config?: RequestConfig) {
    super();
    const defaultConfig: RequestConfig = {
      baseUrl: '',
      commonHeaders: {},
      timeout: 10 * 1000,
      resMark: 'onRes',
      errMark: 'onErr',
    };

    this.config = Object.assign({}, defaultConfig, this.setConfig(config));
  }

  resPipe(pipeFunc?: MiddlewareFunc) {
    console.log('resPipe will be deprecated, call "request.use({ after: fn })"');
    this.use([null, pipeFunc]);
  }

  reqPipe(pipeFunc: MiddlewareFunc) {
    console.log('reqPipe will be deprecated, call "request.use({ before: fn })"');
    this.use([pipeFunc]);
  }

  /**
   * 在发请求前执行的 middleware
   */
  useBefore = (fn: MiddlewareFunc | MiddlewareFunc[]) => {
    this.use({
      before: fn
    });
  }

  /**
   * 在发请求前执行的 middleware
   */
  useAfter = (fn: MiddlewareFunc | MiddlewareFunc[]) => {
    this.use({
      after: fn
    });
  }

  /**
   * 使用中间件
   *
   * @param {MiddlewareOptions | MiddlewareFunc[]} options 如果为数组，则第一个为 before, 第二个为 after
   *
   * @memberof RequestClass
   */
  use = (options: MiddlewareOptions | MiddlewareFunc[]) => {
    let before;
    let after;
    if (Array.isArray(options)) {
      before = options[0];
      after = options[1];
    } else {
      before = options.before;
      after = options.after;
    }
    if (before) this.beforeReqMiddlewares.push(...arrayFilter(before));
    if (after) this.afterResMiddlewares.push(...arrayFilter(after));
  }

  /**
   * 中间件执行器，考虑到可能有异步的中间件，所以使用了递归函数做 async/await 保证执行顺序和返回结果正确
   */
  execMiddlewares = async (targetData: {}, targetMiddlewares: Function[]) => {
    if (!targetMiddlewares) return targetData;
    let nextData = IsObj(targetData) ? Object.assign({}, targetData) : targetData;
    const fnRecursive = async (currIdx: number) => {
      if (currIdx < targetMiddlewares.length) {
        const nextIdx = currIdx + 1;
        const middleware = targetMiddlewares[currIdx];
        if (IsFunc(middleware)) {
          nextData = await middleware(nextData);
        }
        fnRecursive(nextIdx);
      }
    };
    await fnRecursive(0);
    return nextData;
  }

  /**
   * 设置请求对象的配置
   *
   * @param {RequestConfig} config RequestEntity 的配置
   * @returns {void}
   * @memberof RequestClass
   */
  setConfig = (config: RequestConfig) => {
    if (!config) return;
    Object.assign(this.config, config);
  }

  /**
   * 用于广播 response 事件
   *
   * @param {object} res request 返回的 res 对象
   * @memberof RequestClass
   */
  onRes = (res: any) => {
    // 获取完整的 res 对象
    this.emit(this.config.resMark, res);
  }

  /**
   * 用于广播 error 事件
   *
   * @param {object} res request 返回的 res 对象
   * @memberof RequestClass
   */
  onErr = (res: any) => {
    // 广播消息错误
    this.emit(this.config.errMark, res);
  }

  /**
   * 可以被重写的状态判断函数
   *
   * @returns {boolean}
   * @memberof RequestClass
   */
  checkStatus = () => true

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
    let url = this.config.baseUrl;
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
  post = <T = DefaultResponseType>(url, data, options?) => this.request<T>(Object.assign(options || {}, {
    url, data, method: 'POST'
  }))

  /**
   * 发送 PUT 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  put = <T = DefaultResponseType>(url, data, options?) => this.request<T>(Object.assign(options || {}, {
    url, data, method: 'PUT'
  }))

  /**
   * 发送 DELETE 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  del = <T = DefaultResponseType>(url, data, options?) => this.request<T>(Object.assign(options || {}, {
    url, data, method: 'DELETE'
  }))

  /**
   * 发送 PATCH 请求
   *
   * @param {object | string} path 路由字符串或者配置
   * @param {object} data 发送的数据
   * @returns {promise}
   * @memberof RequestClass
   */
  patch = <T = DefaultResponseType>(url, data, options?) => this.request<T>(Object.assign(options, {
    url, data, method: 'PATCH'
  }))

  /**
   * 发送 Get 请求
   *
   * @param {object | string} url URL 字符串或者配置
   * @param {object} options 配置
   * @returns  {promise}
   * @memberof RequestClass
   */
  async get<T = DefaultResponseType>(url: string | BaseRequestParams, options?: BaseRequestParams) {
    const isStringUrl = typeof url === 'string';
    const reqConfig: BaseRequestParams = Object.assign({}, {
      method: 'GET',
    }, options, isStringUrl ? { url } : url);

    return this.request<T>(reqConfig);
  }

  // /**
  //  * 请求对象生成器
  //  *
  //  * @param {string} method String
  //  * @returns {promise} 生产的函数
  //  * @memberof RequestClass
  //  */
  // _reqFactory<T = {}>(
  //   method: RequestMethod
  // ) {
  //   return (
  //     url: string, data: object | string, options = {}
  //   ) => this.request<T>(Object.assign(options, {
  //     url, data, method
  //   }));
  // }

  /**
   * 在请求前 use middleware
   */
  dataFormatFilter = async (data: {}) => {
    const _data = await this.execMiddlewares(data, this.beforeReqMiddlewares);
    // const sendJSON = IsObj(_data);
    // const nextData = !sendJSON ? _data : JSON.stringify(_data);
    return _data;
  }

  /**
   * 底层请求接口，GET POST DELETE PATCH 的实际接口
   *
   * @param {RequestParams} options
   * @returns {promise} 返回请求的 promise 对象
   */
  request = async <T extends RequestRes = RequestRes>(requestParams: BaseRequestParams): Promise<T> => {
    const {
      url, params, data,
      headers, method = 'POST',
      // sendType = 'json',
      returnRaw = false,
      onError = this.onErr,
      ...other
    } = requestParams;
    const fetchInput = this.urlFilter(url, params);
    const isGet = method === 'GET';

    /** 如果是 GET 请求，则不需要 body */
    let bodyData = null;
    let _headers;
    if (!isGet) {
      const body = await this.dataFormatFilter(data);
      const isStringData = typeof body === 'string';
      bodyData = {
        body: isStringData ? body : JSON.stringify(body)
      };
      if (!isGet && !isStringData) {
        _headers = headersMapper.json;
      } else {
        _headers = headersMapper.html;
      }
    }

    const fetchOptions: RequestInit = Object.assign(
      {},
      {
        method,
        headers: Object.assign({}, _headers, this.config.commonHeaders, headers),
        ...other
      },
      bodyData
    );
    // console.log(bodyData, method)

    const result: RequestResStruct = {};

    try {
    /**
     * 1. 尝试发送远端请求, 并解析结果
     */
      const fetchRes = await fetch(fetchInput, fetchOptions);

      const isJsonRes = isResJson(fetchRes);

      let resData = {};

      try {
        resData = await (isJsonRes ? fetchRes.json() : fetchRes.text());
      } catch (e) {
        onError(e);
      }

      resData = await this.execMiddlewares(resData, this.afterResMiddlewares);

      Object.assign(result, {
        data: resData,
        originRes: fetchRes,
        originReq: fetchOptions,
        err: null
      });

      /**
     * 2. 尝试对 res 进行 status 判定
     */
      const isPass = this.checkStatus.call(this, fetchRes);

      /**
     * 3. 如果不成功，进入错误 onError 错误处理机制
     */
      if (!isPass) {
        result.err = 'checkStatus false.';
        onError(result);
      // return returnRaw ? checkFailRes : checkFailRes.data;
      }

      this.onRes(result);
    } catch (e) {
      onError(e);

      Object.assign(result, {
        err: e
      });
    }

    return returnRaw ? result : result.data;
  }
}
// const $request = new RequestClass();

export {
  // $request,
  RequestClass
};
