/**
 * 此文件不能轻易修改
 * 1. 网络请求错误的处理机制
 * 2. 不再处理业务，业务在外部进行处理
 */
import {CallFunc, IsFunc, HasValue, EventEmitterClass} from 'basic-helper';
import {compressFilter, decompressFilter} from './compress-helper';
import {encryptFilter, decryptFilter} from './encrypt-helper';

const canSetFields = [
  'reqUrl', 'compressLenLimit',
  'reconnectTime', 'wallet', 'reqHeader'
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

async function getDecompressAndDectyptDataAsync({
  targetData = {}, originData, compressLenLimit, beforeEncryptHook, wallet
}) {
  /*
  * handle res data step
  * 1. 解密
  * 2. 解压
  */

  return encryptDataResult;
}

if(process.env.NODE_ENV == 'development') window.decryptFilter = decryptFilter;

function getContentType(res) {
  return res.headers.get("content-type");
}

function isResJson(res) {
  return /json/.test(getContentType(res));
}

class UkeFetchClass {
  constructor(config) {
    this.defaultConfig = {
      reqUrl: '',
      compressLenLimit: 2048,
      reconnectedCount: 0, // 记录连接状态
      reconnectTime: 30, // 重连次数, 默认重连五次, 五次都失败将调用
      connectState: 'ok',
      req: null,
      reqQueue: {},
      wallet: '',
      reqHeader: {},
      resMark: 'ON_REQ_RES'
      // 请求回调不在处理业务，请设置对应的业务回调处理
    };

    this.reqStructure = {
      method: '',
      data: {},
      isCompress: false
    }

    this.eventEmitter = new EventEmitterClass();

    Object.assign(this, this.defaultConfig, config);
  }
  onRes(res) {
    // console.log('请配置 onRes');
    this.eventEmitter.emit(this.resMark, res);
  } // 请求完成的 callback
  setResDataHook(resData) {
    // 可以重写，用于做 resData 的业务处理
    console.log('set [$request.setResDataHook = func] first');
    return resData;
  }
  subscribeRes(func) {
    this.eventEmitter.subscribe(this.resMark, func);
  }
  unsubscribeRes(func) {
    this.eventEmitter.unsubscribe(this.resMark, func);
  }
  onErr() {console.log('need set onErr')} // 网络错误
  _wrapDataBeforeSend(targetData) {
    /**
     * [wrapDataBeforeSend 可以重写的方法，以下是默认的方式]
     */
    if(IsFunc(this.wrapDataBeforeSend)) return this.wrapDataBeforeSend(targetData);
    return targetData;
  }
  setRequestConfig(config) {
    /**
     * 避免被设置其他字段
     */
    Object.keys(config).forEach(configKey => {
      if(canSetFields.indexOf(configKey) != -1) {
        this[configKey] = config[configKey];
      }
    });
  }
  async get(url, options) {
    const getResult = await fetch(url, options);
    let isJsonRes = isResJson(getResult);
    // console.log(getResult.headers.get("content-type"))
    let result;
    if(this.checkResStatus(getResult)) {
      result = await (isJsonRes ? getResult.json() : getResult.text());
    } else {
      result = false;
    }
    return result;
  }
  async req(url, postData, options) {
    let {isEncrypt = false, method = 'POST', ...other} = options;
    let headers = isEncrypt ? headersMapper.html : headersMapper.js;
    let fetchOptions = {
      method,
      headers: Object.assign({}, headers, this.reqHeader),
      body: isEncrypt ? postData : JSON.stringify(postData),
      ...other
    };
    let result = null;
    try {
      let fetchRes = await fetch(url, fetchOptions);
      let isJsonRes = isResJson(fetchRes);
      if(this.checkResStatus(fetchRes)) {
        const resData = await (isJsonRes ? fetchRes.json() : fetchRes.text());
        result = resData;
      }
    } catch(e) {
      console.log(e);
      this.onErr();
    }
    return result;
  }
  checkResStatus({status}) {
    return status == 200;
  }
  changeNetworkState(state) {
    if(state == this.connectState) return;
    $GH.EventEmitter && $GH.EventEmitter.emit('CHANGE_NETWORK_STATUS', {
      state
    });
    this.connectState = state;
  }
  // 轮询消息会不断发, 不需要重发消息
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
    const self = this;

    this.reconnectedCount++;
  }
  async send({sendData, reqUrl = this.reqUrl, wallet = this.wallet, onRes, onErr}) {
    if(!reqUrl) return console.log('set $request.setRequestConfig({reqUrl: url}) first');

    const sendDataFilterResult = await getCompressAndEnctyptDataAsync({
      targetData: sendData.data || sendData.Data,
      originData: sendData,
      compressLenLimit: this.compressLenLimit,
      beforeEncryptHook: this._wrapDataBeforeSend.bind(this),
      wallet
    });

    const postResData = await this.req(reqUrl, sendDataFilterResult, {isEncrypt: !!wallet});

    if(postResData) {
      let decryptData = decryptFilter({data: postResData, wallet});
      let dataFilterRes = this.setResDataHook(decryptData);

      if(HasValue(dataFilterRes.data)) {
        this.changeNetworkState('ok');
        const decomResData = dataFilterRes.isCompress ? await decompressFilter(dataFilterRes.data) : dataFilterRes.data;
        dataFilterRes.data = dataFilterRes.Data = decomResData;
      } else {
        console.log('need set data for res data');
      }
      this.onRes({
        resData: dataFilterRes,
      });
      CallFunc(onRes)();

      return dataFilterRes;
    } else {
      this.reconnect();

      CallFunc(onErr)('network error');

      return false;
    }
  }
  async gameGate(sendData, callback, onErr, reqUrl) {
    const sendDataRes = await this.send({
      sendData: sendData,
      reqUrl: reqUrl,
      wallet: this.wallet,
    });
    callback && callback(sendDataRes);
  }
}
const $request = new UkeFetchClass();

export {
  $request, UkeFetchClass
};
