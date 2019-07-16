/* eslint-disable prefer-rest-params */

/**
 * 通过hash url的方式把对应的参数传给新打开的页面
 */
import { HasValue } from 'basic-helper';

export interface UrlParamsRes {
  [targetKey: string]: string;
}

/**
 * 把字符串转换成 base64
 *
 * @export
 * @param {string} [str=''] 传入的字符串
 * @returns {string} 转成 base64 后的字符串
 */
export function toBase64Str(str = '') {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * 把 base64 字符串转成普通字符串
 *
 * @export
 * @param {string} str base64 字符串
 * @returns {string} 普通字符串
 */
export function fromBase64Str(str: string) {
  let res;
  try {
    res = decodeURIComponent(escape(atob(str)));
  } catch (e) {
    console.log(e, str);
  }
  return res;
}

/**
 * 解析并获取浏览器路由的参数
 *
 * @param {string | undefined} targetKey 需要获取的值的 key, 例如 id=123, 此时为 id
 * @param {string} href 需要获取的字符串，默认为 window.location.href
 * @param {boolean} fromBase64 是否 base64 的字符串
 * @returns {string | object} 返回获取的结果
 */
export function getUrlParams(
  targetKey?: string, href?: string, fromBase64?: boolean
): string | object {
  const _href = href || (window ? window.location.href : '');
  if (!_href) {
    return {};
  }

  const searchs = _href.split('?')[1];
  const resultObj: UrlParamsRes = {};
  if (searchs) {
    const params = searchs.split(/&+/);
    let parentKey: string | null = null;
    params.forEach((item) => {
      let [key, val] = item.split('=');
      if (!key) return;
      if (fromBase64) val = fromBase64Str(val);
      if (val === undefined && parentKey) {
        resultObj[parentKey] = `${resultObj[parentKey]}&${key}`;
        parentKey = null;
        return;
      }
      parentKey = key;
      resultObj[key] = val;
    });
  }
  return targetKey ? resultObj[targetKey] : resultObj;
}

/**
 * 解析浏览器的参数
 *
 * @export
 * @param {string} searchStr 需要解析的路由字符串
 * @returns {string} 结果
 */
export function searchUrlParams(searchStr: string): string {
  return window.location.search.replace(new RegExp(`^(?:.*[&\\?]${encodeURI(searchStr).replace(/[.+*]/g, "\\$&")}(?:\\=([^&]*))?)?.*$`, "i"), "$1");
}

/**
 * 解析并构造 url
 * @example
 * resolveUrl('https://example.com', 'route1', 'route2') -> 'https://example.com/route1/route2'
 *
 * @export
 * @param {string} baseUrl 基准 url
 * @param {string} paths 路由们
 * @returns {string} 解析构造后的 url 结果
 */
export function resolveUrl(baseUrl: string, ...paths: string[]) {
  let baseUrlStr = baseUrl;
  if (!baseUrlStr) {
    console.log('please pass baseUrl');
    return baseUrlStr;
  }
  baseUrlStr = baseUrlStr.replace(/\/+$/, '');
  const pathsRes = [...paths].filter(i => !!i);

  if (pathsRes.length === 0) return baseUrlStr;

  let pathStr = pathsRes.join('/');
  pathStr = (`/${pathStr}`).replace(/\/+/g, '/');
  return `${baseUrl}${pathStr}`;
}

// console.log(resolveUrl('//asd.com/asd', '', '/qwe/', '/asd '))

/**
 * 解码 base64 后的参数
 *
 * @export
 * @param {string} sVar 需要解析的 url
 * @param {boolean} [isParse=false] 是否转换
 * @returns {string}
 */
export function decodeHashUrl(sVar: string, isParse = false) {
  const decryptData = searchUrlParams(sVar);
  const decryResult = fromBase64Str(decryptData);
  let result = decryResult;
  if (isParse) {
    try {
      result = JSON.parse(decryResult);
    } catch (e) {
      console.log(e);
    }
  }
  return result;
}

export interface ParamEntity {
  [param: string]: any;
}

export interface WrapUrlParamsOptions {
  url?: string;
  params?: ParamEntity;
  toBase64?: boolean;
}

/**
 * 把 params 包装成 query url 的结构
 *
 * @example
 * urlParamsToQuery({
 *   url: 'https://a.com',
 *   params: {
 *     ID: "123"
 *   }
 * }) -> 'https://a.com?ID=123'
 *
 * @param {WrapUrlParamsOptions} options 包装配置
 * @returns {string} 包装的 url 结果
 */
export function urlParamsToQuery(options: WrapUrlParamsOptions) {
  const { url = '', params = {}, toBase64 = false } = options;
  let resultHash = '?';
  Object.keys(params).forEach((paramKey) => {
    let val = params[paramKey];
    // let val = params[param];
    if (!HasValue(val)) return;
    if (typeof val === 'object') {
      try {
        val = JSON.stringify(val);
      } catch (e) {
        console.log(e);
      }
    }
    resultHash += `${paramKey}=${toBase64 ? toBase64Str(val) : val}&`;
  });
  return url + resultHash;
}

export function wrapReqHashUrl() {
  console.log('wrapReqHashUrl 改名为 urlParamsToQuery');
  return urlParamsToQuery.call(this, arguments);
}

// console.log(wrapReqHashUrl({
//   url: '123',
//   params: {
//     req: 123,
//     qwe: 0,
//     tqw: null
//   }
// }));

/**
 * 打开新的窗口
 *
 * @param {WrapUrlParamsOptions} options
 * @param {string} windowParamStr 标准浏览器的配置
 * @returns {Window}
 */
export function openWindowUseHashUrl(
  options: WrapUrlParamsOptions, windowParamStr: string
): Window {
  const windowObj = window.open(
    urlParamsToQuery(options),
    null,
    windowParamStr
  );
  return windowObj;
}
