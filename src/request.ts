/* eslint-disable arrow-body-style */
/* eslint-disable no-dupe-class-members */
/**
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
} from '@mini-code/base-func';
import {
  resolveUrl, urlParamsToQuery,
  ParamEntity
} from './url-resolve';

export interface RequestConfig {
  /** 基本请求 url */
  baseUrl?: string;
  /** 适用于所有请求的共同 header */
  commonHeaders?: HeadersInit;
  /** 适用于所有请求的 fetchOptions */
  fetchOptions?: RequestInit;
  /** 超时 */
  timeout?: number;
  /** 消息响应的事件名，默认为 onRes */
  resMark?: string;
  /** 消息响应错误的事件名，默认为 onErr */
  errMark?: string;
}

export type RequestMethod = 'POST' | 'GET' | 'DELETE' | 'PUT' | 'PATCH';
export type RequestSendTypes = 'json' | 'html';

export interface BaseRequestParams {
  /** 请求的 url，将拼接在 baseUrl 之后 */
  url: string;
  /** 请求的 http 方法 */
  method?: RequestMethod;
  /** 当前请求的 data */
  data?: {};
  /** 当前请求的 headers */
  headers?: {};
  /** 当前请求的 params，用于封装成 query url */
  params?: ParamEntity;
  /** 如果当前请求发生错误，则触发的回调 */
  onError?: (event) => void;
}

export interface RequestParams extends BaseRequestParams {
  /** 必须传入的 data */
  data: {};
}

export interface ResDataBase {
  /** 如果返回的结果是 string 类型，则封装在此字段 */
  __text?: string;
  /** 原生的 fetch Request */
  __originReq?: {};
  /** 原生的 fetch Response */
  __originRes?: {};
  /** 原生请求 body */
  __reqBody?: {};
  /**
   * 是否发生 http 错误
   * 由 $R.checkStatus 回调返回
   * 并且将会触发传入到 request api 中的 onError
   */
  __err?: string;
}

export interface ResData extends ResDataBase {
  [key: string]: any;
}

export type MiddlewareFuncBefore = (reqData: RequestParams) => any;
export type MiddlewareFuncAfter = (resData: ResDataBase, resDataBase: ResDataBase) => any;

export interface MiddlewareOptions {
  /** 发起请求之前的中间件函数 */
  before?: MiddlewareFuncBefore | MiddlewareFuncBefore[];
  /** 收到回应之后，返回数据结构之前的中间件函数 */
  after?: MiddlewareFuncAfter | MiddlewareFuncAfter[];
}
// export type RequestRes = RequestResStruct | RequestResStruct['data'];

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
 * 请求对象的构造类
 *
 * @class RequestClass
 * @extends {EventEmitterClass}
 * @example
 *
 * import { RequestClass } from '@mini-code/request';
 *
 * const $R = new RequestClass();
 *
 * $R.get({
 *   url: '/getUrl',
 *   params: {
 *     ID: 123
 *   }
 * })
 *
 */
class RequestClass<DefaultResponseType extends ResData = ResData> extends EventEmitterClass {
  config: RequestConfig = {
    baseUrl: '',
    timeout: 10 * 1000,
    resMark: 'onRes',
    errMark: 'onErr',
  };

  beforeReqMiddlewares: MiddlewareFuncBefore[] = [];

  afterResMiddlewares: MiddlewareFuncAfter[] = [];

  constructor(config?: RequestConfig) {
    super();

    if (config) this.setConfig(config);
  }

  /**
   * 在发请求前执行的 middleware
   */
  useBefore = (fn: MiddlewareFuncBefore | MiddlewareFuncBefore[]) => {
    this.use({
      before: fn
    });
  }

  /**
   * 在发请求前执行的 middleware
   */
  useAfter = (fn: MiddlewareFuncAfter | MiddlewareFuncAfter[]) => {
    this.use({
      after: fn
    });
  }

  /**
   * 使用中间件
   */
  use = (options: MiddlewareOptions | [MiddlewareFuncBefore, MiddlewareFuncAfter]) => {
    let before: MiddlewareFuncBefore | MiddlewareFuncBefore[];
    let after: MiddlewareFuncAfter | MiddlewareFuncAfter[];
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
   * 中间件执行器
   */
  private execMiddlewares = async (targetMiddlewares: Function[], targetData, extraData?) => {
    if (!targetMiddlewares) {
      // 如果没有使用中间件，则直接返回数据
      return targetData;
    }
    let nextData = IsObj(targetData) ? Object.assign({}, targetData) : targetData;
    const fnRecursive = async (currIdx: number) => {
      if (currIdx < targetMiddlewares.length) {
        const nextIdx = currIdx + 1;
        const middleware = targetMiddlewares[currIdx];
        if (IsFunc(middleware)) {
          // 考虑到可能有异步的中间件，所以使用了递归函数做 async/await 保证执行顺序和返回结果正确
          nextData = await middleware(nextData, extraData);
        }
        fnRecursive(nextIdx);
      }
    };
    await fnRecursive(0);
    return nextData;
  }

  /**
   * 设置请求对象的配置
   */
  setConfig = (config: RequestConfig) => {
    if (!config) return;
    Object.assign(this.config, config);
  }

  /**
   * 用于广播 response 事件
   */
  onRes = (res: any) => {
    // 获取完整的 res 对象
    this.emit(this.config.resMark, res);
  }

  /**
   * 用于广播 error 事件
   */
  onErr = (res: any) => {
    // 广播消息错误
    this.emit(this.config.errMark, res);
  }

  /**
   * 可以被重写的状态判断函数
   */
  checkStatus = (fetchRes: Response) => true

  /**
   * 解析 url, 可以封装
   */
  urlFilter = (path: string, params?: ParamEntity) => {
    let url;
    if (/https?/.test(path) || /^(\/\/)/.test(path)) {
      // return path;
      url = path;
    } else {
      const baseUrl = this.config.baseUrl;
      url = resolveUrl(baseUrl, path);
    }
    if (!url) {
      console.log('set $request.setConfig({baseUrl: url}) first');
      return '';
    }
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
   * 上传文件
   */
  upload = (url: string, data: RequestInit["body"]) => {
    const _url = this.urlFilter(url);
    return fetch(_url, {
      method: 'POST',
      body: data,
      // headers: uploadHeader,
    });
  }

  /**
   * 生成 RESTFul Api 的工厂函数
   */
  _reqFac = (method: RequestMethod) => <T = DefaultResponseType>(url: string | BaseRequestParams, data?: BaseRequestParams['data'], options?) => {
    const isStringUrl = typeof url === 'string';
    return this.request<T>(Object.assign(
      { method },
      options,
      data ? { data } : {},
      isStringUrl ? { url } : url
    ));
  }

  /**
   * POST API
   */
  post = this._reqFac('POST')

  /**
   * PUT API
   */
  put = this._reqFac('PUT')

  /**
   * DELETE API
   */
  del = this._reqFac('DELETE')

  /**
   * PATCH API
   */
  patch = this._reqFac('PATCH')

  /**
   * Get API
   */
  async get<T = DefaultResponseType>(
    url: string | BaseRequestParams, options?: BaseRequestParams
  ) {
    const isStringUrl = typeof url === 'string';
    const reqConfig: BaseRequestParams = Object.assign({}, {
      method: 'GET',
    }, options, isStringUrl ? { url } : url);

    return this.request<T>(reqConfig);
  }

  /**
   * 在请求前 use middleware
   */
  dataFormatFilter = async (data: {}) => {
    const _data = await this.execMiddlewares(this.beforeReqMiddlewares, data);
    return _data;
  }

  /**
   * 底层请求接口，GET POST DELETE PATCH 的实际接口
   */
  request = async <T extends ResData = DefaultResponseType>(
    requestParams: BaseRequestParams
  ): Promise<T & ResData> => {
    const {
      url, params, data,
      headers, method = 'POST',
      // sendType = 'json',
      // returnRaw = false,
      onError = this.onErr,
      ...other
    } = requestParams;
    const isGet = method === 'GET';

    /** 如果是 GET 请求，则不需要 body */
    let bodyData = null;
    let body;
    let _headers;
    if (!isGet) {
      body = await this.dataFormatFilter(data);
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
      },
      this.config.fetchOptions,
      other,
      bodyData
    );
    // console.log(bodyData, method)

    // const result: RequestResStruct = {};
    let resData: ResData = {};

    try {
      /**
       * 1. 尝试发送远端请求, 并解析结果
       */
      const fetchInput = this.urlFilter(url, params);
      const fetchRes = await fetch(fetchInput, fetchOptions);

      const isJsonRes = isResJson(fetchRes);

      // let resData = {};

      try {
        resData = await (isJsonRes ? fetchRes.json() : fetchRes.text());
      } catch (e) {
        onError(e);
      }

      if (typeof resData === 'string') {
        resData = {
          __text: resData
        };
      }

      const resDataBase = {
        __originRes: fetchRes,
        __originReq: fetchOptions,
        __reqBody: body,
        __err: null
      };

      resData = await this.execMiddlewares(this.afterResMiddlewares, resData, resDataBase);

      /** 合并由中间件返回的数据 */
      Object.assign(resData, resDataBase);

      /**
       * 2. 尝试对 res 进行 status 判定
       */
      const isPass = this.checkStatus.call(this, fetchRes);

      /**
       * 3. 如果不成功，进入错误 onError 错误处理机制
       */
      if (!isPass) {
        resData.__err = 'checkStatus false.';
        onError(resData);
        // return returnRaw ? checkFailRes : checkFailRes.data;
      }

      this.onRes(resData);
    } catch (e) {
      onError(e);

      resData.__err = e;
    }

    // return returnRaw ? result : result.data;
    return resData;
  }
}

export {
  // $request,
  RequestClass
};
