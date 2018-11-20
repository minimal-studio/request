import LZMA from './libs/lzma_worker';

/**
 * 压缩数据
 *
 * @export
 * @param {object} options {data, compressLenLimit = 2048}
 * @returns {promise}
 */
export function compressFilter({data, compressLenLimit = 2048}) {
  return new Promise((resolve, reject) => {
    let resultObj = {
      isCompress: false,
      data,
    }
    let strPostData = JSON.stringify(data);

    if(strPostData.length > compressLenLimit) {
      resultObj.isCompress = true;
      LZMA.compress(JSON.stringify(data), 1, (decompressResult) => {
        resultObj.data = convertToFormatedHex(decompressResult).toString();
        resolve(resultObj);
      });
    } else {
      resolve(resultObj);
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
    let isCompress = typeof data == 'string';
    if(isCompress) {
      let decompressData = convertFormatedHexToBytes(data);
      LZMA.decompress(decompressData, (result, err) => {
        let resData = {};
        if(!!err) return reject(err);
        try {
          resData = JSON.parse(result);
        } catch(e) {
          reject('decompress fail');
        }
        resolve(resData);
      });
    } else {
      resolve(data);
    }
  });
}

function convertFormatedHexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
  bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

function convertToFormatedHex(byteArr) {
  if (byteArr.length === 0) return false;
  let hexStr = "";
  let tmpHex;
  let len = byteArr.length;
  for (let i = 0; i < len; ++i) {
    if (byteArr[i] < 0) {
      byteArr[i] = byteArr[i] + 256;
    }
    tmpHex = byteArr[i].toString(16);
    if (tmpHex.length === 1) {
      tmpHex = "0" + tmpHex;
    }
    hexStr += tmpHex;
  }
  return hexStr.trim();
}
