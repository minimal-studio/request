/**
 * 通过hash url的方式把对应的参数传给新打开的页面
 */
import { HasValue } from 'basic-helper';

/**
 * 解析并获取浏览器路由的参数
 *
 * @export
 * @param {string} key 需要获取的值的 key, 例如 id=123, 此时为 id
 * @param {string} href 需要获取的字符串，默认为 window.location.href
 * @returns {string} 返回获取的结果
 */
export function getUrlParams(key, href) {
  // let searchs = 'http://localhost:3030/#/BANK'.split('?')[1];
  let _href = href || !!window ? window.location.href : '';
  if(!_href) return;
  let searchs = _href.split('?')[1];
  let resultObj = {};
  if(!searchs) return {};
  let params = searchs.split(/&+/);
  params.forEach(item => {
    let [key, val] = item.split('=');
    resultObj[key] = val;
  });
  return key ? resultObj[key] : resultObj;
}

/**
 * 解析浏览器的参数
 *
 * @export
 * @param {string} searchStr 需要解析的路由字符串
 * @returns {string} 结果
 */
export function searchUrlParams(searchStr) {
  return window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(searchStr).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1");
}

/**
 * 解析并构造 url
 * @example
 * resolveUrl('https://example.com', 'route1', 'route2') -> https://example.com/route1/route2
 * 
 * @export
 * @param {string} baseUrl 基准 url
 * @param {string} paths 路由们
 * @returns {string} 解析构造后的 url 结果
 */
export function resolveUrl(baseUrl, ...paths) {
  if(!baseUrl) return console.log('please pass baseUrl');
  baseUrl = baseUrl.replace(/\/+$/, '');
  let pathsRes = [...paths].filter(i => !!i);

  if(pathsRes.length == 0) return baseUrl;
  
  let pathStr = pathsRes.join('/');
  pathStr = ('/' + pathStr).replace(/\/+/g, '/');
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
export function decodeHashUrl(sVar, isParse = false) {
  let decryptData = searchUrlParams(sVar);
  let decryResult = fromBase64Str(decryptData);
  let result = decryResult;
  if(isParse) {
    try {
      result = JSON.parse(decryResult);
    } catch(e) {

    }
  }
  return result;
}

/**
 * 包装 url
 *
 * @export
 * @param {object} {url = '', params = {}, toBase64 = true} 包装配置
 * @returns {string} 包装的 url 结果
 */
export function wrapReqHashUrl({url = '', params = {}, toBase64 = true}) {
  let resultHash = '?';
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      let val = params[param];
      if(!HasValue(val)) continue;
      if(typeof val == 'object') {
        try {
          val = JSON.stringify(val);
        } catch(e) {
          console.log(e)
        }
      }
      resultHash += `${param}=${toBase64 ? toBase64Str(val): val}&`;
    }
  }
  return url + resultHash;
}

// console.log(wrapReqHashUrl({
//   url: '123',
//   params: {
//     req: 123,
//     qwe: 0,
//     tqw: null
//   }
// }))

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
export function fromBase64Str(str) {
  return decodeURIComponent(escape(atob(str)));
}

/**
 * 打开新的窗口
 *
 * @export
 * @param {object} options
 * @param {string} windowParamStr 标准浏览器的配置
 * @returns {void}
 */
export function openWindowUseHashUrl(options, windowParamStr) {
  let windowObj = window.open(
    wrapReqHashUrl(options),
    null,
    windowParamStr
  );
  return windowObj;
}
