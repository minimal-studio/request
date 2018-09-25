/**
 * Lib: Uke Request
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

import { CallFunc, IsFunc, HasValue, EventEmitterClass } from 'basic-helper';
import { compressFilter, decompressFilter } from './compress-helper';
import { encryptFilter, decryptFilter } from './encrypt-helper';
import { resolveUrl, wrapReqHashUrl } from './url-resolve';

const canSetFields = [
  'compressLenLimit', 'baseUrl', 'timeout',
  'reconnectTime', 'wallet', 'commonHeaders'
];

const headersMapper = {
  js: {'Content-Type': 'application/json; charset=utf-8'},
  html: {'Content-Type': 'text/html'}
}

async function getCompressAndEnctyptDataAsync({
  targetData = {}, originData, compressLenLimit, beforeEncryptHook, wallet
}) {
  /**
   * wrap send data step
   * 1. 压缩 filter
   * 2. 加密 filter
   */
  const compressedData = await compressFilter({
    data: targetData,
    compressLenLimit,
  });
  let runningData = Object.assign({}, originData, compressedData);
  // do encrypt filter before send, get the wrap data from outside setting.
  let wrapedData = beforeEncryptHook(runningData);
  let encryptDataResult = encryptFilter({
    data: wrapedData,
    wallet: wallet,
  });

  return encryptDataResult;
}

if(process.env.NODE_ENV == 'development') {
  window.decryptFilter = decryptFilter;
  window.decompressFilter = decompressFilter;
}

function getContentType(res) {
  return res.headers.get("content-type");
}

function isResJson(res) {
  return /json/.test(getContentType(res));
}

class RequestClass extends EventEmitterClass {
  constructor(config) {
    super();
    this.defaultConfig = {
      baseUrl: '',
      compressLenLimit: 2048,
      reconnectedCount: 0, // 记录连接状态
      reconnectTime: 30, // 重连次数, 默认重连五次, 五次都失败将调用
      connectState: 'ok',
      wallet: '',
      commonHeaders: {},
      timeout: 10 * 1000,
      resMark: 'onRes',
      errMark: 'onErr',
    };

    this.reqStructure = {
      route: '/',
      data: {},
      isCompress: false
    }

    // this.eventEmitter = new EventEmitterClass();

    Object.assign(this, this.defaultConfig, this.setConfig(config));

    this.post = this._reqFactory('POST');
    this.put = this._reqFactory('PUT');
    this.del = this._reqFactory('DELETE');
  }
  _reqFactory(method) {
    return (url, data, options = {}) => this.request(Object.assign(options, {
      url, data, method
    }));
  }
  setConfig(config) {
    if(!config) return {};
    /**
     * 避免被设置其他字段
     */
    Object.keys(config).forEach(configKey => {
      if(canSetFields.indexOf(configKey) != -1) {
        this[configKey] = config[configKey];
      }
    });
  }
  onRes(res) {
    // 获取完整的 res 对象
    this.emit(this.resMark, res);
  }
  onErr(res) {
    // 广播消息错误
    this.emit(this.errMark, res);
  }
  setResDataHook(resData) {
    // 可以重写，用于做 resData 的业务处理
    console.log('set [$request.setResDataHook = func] first');
    return resData;
  }
  _wrapDataBeforeSend(targetData) {
    /**
     * [wrapDataBeforeSend 可以重写的方法，以下是默认的方式]
     */
    if(IsFunc(this.wrapDataBeforeSend)) return this.wrapDataBeforeSend(targetData);
    return targetData;
  }
  urlFilter(path) {
    if(/https?/.test(path)) return path;
    let url = this.baseUrl;
    if(!url) return console.log('set $request.setConfig({baseUrl: url}) first');
    return resolveUrl(url, path);
  }
  upload(path, data) {
    let _url = this.urlFilter(path);
    return fetch({
      url: _url,
      method: 'POST',
      data,
      // headers: uploadHeader,
    });
  }
  async get(url, options) {
    let reqConfig = {
      method: 'GET',
      url, ...options
    };

    if(typeof url !== 'string') {
      reqConfig.url = wrapReqHashUrl({
        ...url,
        toBase64: false
      });
    }

    return this.request(reqConfig);
  }
  async request({
    url, data, headers, method = 'POST', isEncrypt = false, resolveRes = true, ...other
  }) {
    let _url = this.urlFilter(url);
    let _headers = isEncrypt ? headersMapper.html : headersMapper.js;

    let fetchOptions = {
      method,
      headers: Object.assign({}, _headers, this.commonHeaders, headers),
      body: isEncrypt ? data : JSON.stringify(data),
      ...other
    };

    let result = {};

    try {

      let fetchRes = await fetch(_url, fetchOptions);
      let isJsonRes = isResJson(fetchRes);
      let resData = await (isJsonRes ? fetchRes.json() : fetchRes.text());

      Object.assign(result, {
        data: resData,
        originRes: fetchRes,
        originReq: fetchOptions
      });

      this.onRes(result);
      
    } catch(e) {
      console.log(e);

      Object.assign(result, {
        data: null,
        err: e
      });

      this.onErr(e);
    }

    return result.data;
  }
  changeNetworkState(state) {
    if(state == this.connectState) return;
    this.emit('CHANGE_NETWORK_STATUS', {
      state
    });
    this.connectState = state;
  }
  reconnect() {
    this.changeNetworkState('tryToConnecting');

    if(!!this.timer) clearTimeout(this.timer);
    if(this.reconnectedCount > this.reconnectTime) {
      this.changeNetworkState('fail');
      return this.onErr();
    }
    if(this.reconnectedCount == 15) {
      this.changeNetworkState('reconnecting');
    }

    this.reconnectedCount++;
  }
  async send({sendData, url, path, wallet = this.wallet, method = 'POST', headers, onRes, onErr}) {
    const sendDataFilterResult = await getCompressAndEnctyptDataAsync({
      targetData: sendData.data || sendData.Data,
      originData: sendData,
      compressLenLimit: this.compressLenLimit,
      beforeEncryptHook: this._wrapDataBeforeSend.bind(this),
      wallet
    });

    const postResData = await this.request({
      url: url || path,
      data: sendDataFilterResult, 
      isEncrypt: !!wallet,
      method,
      headers
    });

    if(HasValue(postResData.data)) {
      let decryptData = decryptFilter({data: postResData.data, wallet});
      let dataFilterRes = this.setResDataHook(decryptData);

      if(HasValue(dataFilterRes.data)) {
        this.changeNetworkState('ok');
        const decomResData = dataFilterRes.isCompress ? await decompressFilter(dataFilterRes.data) : dataFilterRes.data;
        dataFilterRes.data = dataFilterRes.Data = decomResData;
      } else {
        console.log('need set data for res data');
      }

      CallFunc(onRes)(postResData);

      return dataFilterRes;
    } else {
      // this.reconnect('not res data.');

      CallFunc(onErr)('not res data.');

      return false;
    }
  }
}
const $request = new RequestClass();

export {
  $request, RequestClass
};
