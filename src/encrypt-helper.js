import RC4 from './rc4.js';

/**
 * 为了实现多个接口，不同的加密 key 的方法
 */
let rc4EntityMapper = {};
function getRc4Entity(encryptKey) {
  let resultObj = rc4EntityMapper[encryptKey];
  if(!resultObj) {
    resultObj = rc4EntityMapper[encryptKey] = new RC4(encryptKey);
  }
  return resultObj;
}

function restoreKey(keyArr) {
  let result = '';
  if(Array.isArray(keyArr)) {
    for (let i = 0; i < keyArr.length; i++) {
      result += (String.fromCharCode(keyArr[i] - i));
    }
  }
  return result;
}

let encryKeyStore = {};

function walletFilter(wallet) {
  if(!encryKeyStore[wallet]) encryKeyStore[wallet] = Array.isArray(wallet) ? restoreKey(wallet) : wallet;
  return encryKeyStore[wallet];
}
/**
 * 加密过滤器
 * @param  {String}   wallet          加密的key的代码，wallet
 * @return {String}                   加密后的字符串
 * KNIMKLIQ
 */
export function encryptFilter({data, callback, wallet}) {
  let encryptKey = walletFilter(wallet);
  let resultData = data;

  if(encryptKey) {
    let dataStr = JSON.stringify(data);
    let currRc4Entity = getRc4Entity(encryptKey);
    resultData = currRc4Entity.encrypt(btoa(unescape(encodeURIComponent(dataStr))));
  }
  return resultData;
}

export function decryptFilter({data, wallet}) {
  let encryptKey = walletFilter(wallet);
  let _data = data;

  if (encryptKey) {
    let currRc4Entity = getRc4Entity(encryptKey);
    let decryptData = currRc4Entity.decrypt(_data);
    try {
      let decodeRes = decodeURIComponent(escape(atob(decryptData)));
      _data = JSON.parse(decodeRes);
    } catch (e) {}
  }
  // let result = (typeof _data === 'string' ? JSON.parse(_data) : _data) || {};
  return _data;
}
