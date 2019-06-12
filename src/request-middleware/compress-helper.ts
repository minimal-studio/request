import LZMA from './libs/lzma_worker';

function convertFormatedHexToBytes(hex: []) {
  for (let bytes = [], c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function convertToFormatedHex(byteArr) {
  if (byteArr.length === 0) return false;
  let hexStr = "";
  let tmpHex;
  const len = byteArr.length;
  for (let i = 0; i < len; ++i) {
    if (byteArr[i] < 0) {
      byteArr[i] = byteArr[i] + 256;
    }
    tmpHex = byteArr[i].toString(16);
    if (tmpHex.length === 1) {
      tmpHex = `0${tmpHex}`;
    }
    hexStr += tmpHex;
  }
  return hexStr.trim();
}

/**
 * 压缩数据
 *
 * @export
 * @param {object} options {data, compressLenLimit = 2048}
 * @returns {promise} { isCompress: boolean, data: data }
 */
export function compressFilter({ data, compressLenLimit = 2048, compress }) {
  return new Promise((resolve, reject) => {
    const resultObj = {
      isCompress: false,
      data,
    };
    if (!compress || !data) return resolve(resultObj);
    const strPostData = JSON.stringify(data);

    if (strPostData.length > compressLenLimit) {
      resultObj.isCompress = true;
      LZMA.compress(JSON.stringify(data), 1, (decompressResult) => {
        resultObj.data = convertToFormatedHex(decompressResult).toString();
        resolve(resultObj);
      });
    } else {
      return resolve(resultObj);
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
export function decompressFilter(data) {
  return new Promise((resolve, reject) => {
    const isCompress = typeof data === 'string';
    if (isCompress) {
      const decompressData = convertFormatedHexToBytes(data);
      LZMA.decompress(decompressData, (result, err) => {
        let resData = {};
        if (err) return reject(err);
        try {
          resData = JSON.parse(result);
        } catch (e) {
          reject('decompress fail');
        }
        resolve(resData);
      });
    } else {
      resolve(data);
    }
  });
}
