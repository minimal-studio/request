import RC4 from 'rc4-ts';
// import RC4 from './libs/rc4';

/**
 * 为了实现多个接口，不同的加密 key 的方法
 */
const rc4EntityMapper: {
  [key: string]: RC4;
} = {};

/**
 * 获取 RC4 存储对象
 *
 * @private
 * @param {string} encryptKey
 * @returns {RC4Entity}
 */
function getRc4Entity(encryptKey: string) {
  let resultObj = rc4EntityMapper[encryptKey];
  if (!resultObj) {
    resultObj = new RC4(encryptKey);
    rc4EntityMapper[encryptKey] = resultObj;
  }
  return resultObj;
}

/**
 * 将一个数组转换成字符串
 *
 * @private
 * @param {array} keyArr
 * @returns {string}
 */
function restoreKey(keyArr: []) {
  let result = '';
  if (Array.isArray(keyArr)) {
    for (let i = 0; i < keyArr.length; i++) {
      result += (String.fromCharCode(keyArr[i] - i));
    }
  }
  return result;
}

const encryKeyStore: {
  [key: string]: string;
} = {};

/**
 * 密钥过滤器
 *
 * @private
 * @param {array} key 密钥
 * @returns {string}
 */
function keyFilter(key: string) {
  if (!encryKeyStore[key]) {
    encryKeyStore[key] = Array.isArray(key) ? restoreKey(key) : key;
  }
  return encryKeyStore[key];
}

interface EncryptOptions {
  data: {};
  /** 加密 key */
  key: string;
}

/**
 * 加密过滤器
 *
 * @public
 * @param  {EncryptOptions} options
 * @return {string} 加密后的字符串
 */
export function encryptFilter(options: EncryptOptions) {
  const { data, key } = options;
  const encryptKey = keyFilter(key);
  let encryptRes;

  if (encryptKey) {
    const dataStr = JSON.stringify(data);
    const currRc4Entity = getRc4Entity(encryptKey);
    encryptRes = currRc4Entity.encrypt(btoa(unescape(encodeURIComponent(dataStr))));
  }
  return encryptRes || data;
}

interface DecryptOptions {
  data: string;
  /** 加密 key */
  key: string;
}

/**
 * 解密函数
 *
 * @export
 * @param {DecryptOptions} options
 * @returns {data}
 */
export function decryptFilter(options: DecryptOptions) {
  const { data, key } = options;
  if (typeof data !== 'string') return data;
  const encryptKey = keyFilter(key);
  let _data = data;

  if (encryptKey) {
    const currRc4Entity = getRc4Entity(encryptKey);
    const decryptData = currRc4Entity.decrypt(_data) || '';
    try {
      const decodeRes = decodeURIComponent(escape(atob(decryptData)));
      _data = decodeRes;
      try {
        _data = JSON.parse(decodeRes);
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      console.log(e);
    }
  }
  // let result = (typeof _data === 'string' ? JSON.parse(_data) : _data) || {};
  return _data;
}

export function encrypt(key: string) {
  return (data: {}) => {
    const res = encryptFilter({ data, key });
    // console.log('encrypt', res);
    return res;
  };
}

export function decrypt(key: string) {
  return async (data: string) => {
    const res = decryptFilter({ data, key });
    return res;
  };
}
