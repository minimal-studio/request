/**
 * 通过hash url的方式把对应的参数传给新打开的页面
 */

export function searchUrlParams(searchStr) {
  return window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(searchStr).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1");
}

export function decodeHashUrl(sVar, isParse = false) {
  let decryptData = searchUrlParams(sVar);
  let decryResult = unbase64Str(decryptData);
  let result = decryResult;
  if(isParse) {
    try {
      result = JSON.parse(decryResult);
    } catch(e) {

    }
  }
  return result;
}

export function wrapReqHashUrl({url, params}) {
  let resultHash = '?';
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      let val = params[param];
      if(typeof val == 'object') {
        try {
          val = JSON.stringify(val);
        } catch(e) {
          console.log(e)
        }
      }
      resultHash += `${param}=${base64Str(val)}&`;
    }
  }
  return url + resultHash;
}

export function base64Str(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export function unbase64Str(str) {
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
