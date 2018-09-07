/**
 * 通过hash url的方式把对应的参数传给新打开的页面
 */
import {HasValue} from 'basic-helper';

export function getUrlParams(key) {
  // let searchs = 'http://localhost:3030/#/BANK'.split('?')[1];
  let searchs = window.location.href.split('?')[1];
  let resultObj = {};
  if(!searchs) return {};
  let params = searchs.split(/&+/);
  params.forEach(item => {
    let [key, val] = item.split('=');
    resultObj[key] = val;
  });
  return key ? resultObj[key] : resultObj;
}

export function searchUrlParams(searchStr) {
  return window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(searchStr).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1");
}

export function resolveUrl(...urls) {
  let urlStr = [...urls].join('/');
  let seperater = '://';
  let [protocal, other] = urlStr.split(seperater);
  other = other.replace(/\/+/g, '/');
  urlStr = `${protocal}${seperater}${other}`
  return urlStr;
}

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

export function wrapReqHashUrl({url, params, toBase64 = true}) {
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

export function toBase64Str(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export function fromBase64Str(str) {
  return decodeURIComponent(escape(atob(str)));
}

export function openWindowUseHashUrl(hashOptions, windowParamStr) {
  let windowObj = window.open(
    wrapReqHashUrl(hashOptions),
    null,
    windowParamStr
  );
  return windowObj;
}
