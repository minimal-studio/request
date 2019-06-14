/* eslint-disable no-param-reassign */

import { LZMA } from 'lzma/src/lzma_worker';
import { CallFunc } from 'basic-helper';

function convertFormatedHexToBytes(hex: string) {
  let bytes = [];
  let c = 0;
  for (bytes = [], c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function convertToFormatedHex(byteArr: number[]) {
  if (byteArr.length === 0) return false;
  let hexStr = "";
  let tmpHex;
  const len = byteArr.length;
  for (let i = 0; i < len; ++i) {
    if (byteArr[i] < 0) {
      byteArr[i] += 256;
    }
    tmpHex = byteArr[i].toString(16);
    if (tmpHex.length === 1) {
      tmpHex = `0${tmpHex}`;
    }
    hexStr += tmpHex;
  }
  return hexStr.trim();
}

interface CompressParams {
  data: {};
  isCompress: boolean;
}

interface DecompressParams {
  data: string;
  isCompress: boolean;
}

type MiddlewareCallback<T> = (parmas: T) => T;

interface CompressOptions {
  data: {};
  compressLenLimit: number;
}

/**
 * 压缩数据
 *
 * @export
 * @param {object} options {data, compressLenLimit = 2048}
 */
export function compressFilter(options: CompressOptions): Promise<CompressParams> {
  const { data, compressLenLimit = 2048 } = options;
  return new Promise((resolve, reject) => {
    if (!data) {
      return resolve({
        data,
        isCompress: false
      });
    }

    const strPostData = JSON.stringify(data);
    if (strPostData.length > compressLenLimit) {
      LZMA.compress(JSON.stringify(data), 1, (decompressResult: number[]) => {
        const resultStr = convertToFormatedHex(decompressResult).toString();
        resolve({
          data: resultStr,
          isCompress: true
        });
      });
    } else {
      return resolve({
        data,
        isCompress: false
      });
    }
  });
}

/**
 * 解压数据
 *
 * @export
 * @param {string} data 压缩后的字符串
 * @returns {string}
 */
export function decompressFilter(params: DecompressParams): Promise<DecompressParams> {
  return new Promise((resolve, reject) => {
    const { data, isCompress } = params;
    if (isCompress && typeof data === 'string') {
      const decompressData = convertFormatedHexToBytes(data);
      const resData = {
        data: '',
        isCompress
      };
      LZMA.decompress(decompressData, (result: string, err: Error) => {
        if (err) return reject(err);
        try {
          resData.data = JSON.parse(result);
        } catch (e) {
          reject(new Error('decompress fail'));
        }
        resolve(resData);
      });
    } else {
      resolve(params);
    }
  });
}

/**
 * Request 的内置压缩中间件
 *
 * @export
 * @param {number} compressLenLimit
 * @param {MiddlewareCallback<CompressParams>} dataWrapperCompress
 * @returns
 */
export function compress(
  compressLenLimit: number,
  dataWrapperCompress: MiddlewareCallback<CompressParams>
) {
  return async (data: {}) => {
    const compressOptions: CompressOptions = {
      data,
      compressLenLimit,
    };
    let res = await compressFilter(compressOptions);
    res = CallFunc(dataWrapperCompress)(res);
    return res;
  };
}

/**
 * Request 的内置解压中间件
 *
 * @export
 * @param {MiddlewareCallback<DecompressParams>} dataWrapperBefore
 * @param {MiddlewareCallback<DecompressParams>} dataWrapperAfter
 * @returns
 */
export function decompress(
  // dataWrapperBefore: MiddlewareCallback<DecompressParams>,
  dataWrapperBefore: Function,
  dataWrapperAfter: MiddlewareCallback<DecompressParams>
) {
  return async (data: {}) => {
    const decompressData = dataWrapperBefore(data);
    let res = await decompressFilter(decompressData);
    res = CallFunc(dataWrapperAfter)(res);
    return res;
  };
}
