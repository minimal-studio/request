/**
 * 此文件不能轻易修改
 * 1. 网络请求错误的处理机制
 * 2. 不再处理业务，业务在外部进行处理
 */
import {callFunc, isFunc, generteID, EventEmitterClass} from 'basic-helper';
import {compressFilter, decompressFilter} from './compress-helper';
import {encryptFilter, decryptFilter} from './encrypt-helper';

const canSetFields = [
  'reqUrl', 'compressLenLimit',
  'reconnectTime', 'wallet'
];

const headersMapper = {
  js: {'Content-Type': 'application/json; charset=utf-8'},
  html: {'Content-Type': 'text/html'}
}

class MatrixRequest {
  constructor(config) {
    const self = this;

    this.defaultConfig = {
      reqUrl: '',
      compressLenLimit: 2048,
      reconnectedCount: 0, // 记录连接状态
      reconnectTime: 30, // 重连次数, 默认重连五次, 五次都失败将调用
      connectState: 'ok',
      req: null,
      reqQueue: {},
      wallet: '',
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
  resDataFilter(resData) {
    // 可以重写，用于做 resData 的业务处理
    console.log('set [$request.resDataFilter = func] first');
    return resData;
  }
  subscribeRes(func) {
    this.eventEmitter.subscribe(this.resMark, func);
  }
  unsubscribeRes(func) {
    this.eventEmitter.unsubscribe(this.resMark, func);
  }
  onErr() {console.log('请配置 onErr')} // 请求失败的 callback
  /**
   * [wrapDataBeforeSend 可以重写的方法，以下是默认的方式]
   */
  _wrapDataBeforeSend(targetData) {
    if(isFunc(this.wrapDataBeforeSend)) return this.wrapDataBeforeSend(targetData);
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
  resetReqHeader() {
    this.reqHeaders = {};
  }
  get(url, callback) {
    return fetch(url, {
      // headers: this.reqHeaders,
      method: 'GET'
    })
    .then((res) => {
      callFunc(callback)(res);
      if(res.status == 200) return res.text();
    })
    // .then(resTxt => callFunc(callback)(resTxt))
    .catch(e => {
      callFunc(callback)(false);
      console.log(e);
    });
  }
  post(url, postData, callback) {
    fetch(url, {
      headers: this.reqHeaders,
      method: 'POST',
      body: postData
    }).then((res) => {
      callFunc(callback)(res);
    });
  }
  changeNetworkState(state) {
    if(state == this.connectState) return;
    $GH.EventEmitter && $GH.EventEmitter.emit('CHANGE_NETWORK_STATUS', {
      state
    });
    this.connectState = state;
  }
  // 轮询消息会不断发, 不需要重发消息
  reconnect(postData, sendURL, callback) {
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
  reqDone(reqID) {
    delete this.reqQueue[reqID];
  }
  _send({sendData, reqUrl = this.reqUrl, callback, wallet = this.wallet, onErr}) {
    if(!reqUrl) return console.log('set $request.setRequestConfig({reqUrl: url}) first');

    let self = this;

    function send(_sendData) {
      let isEncrypt = !!wallet;
      let headers = isEncrypt ? headersMapper.html : headersMapper.js;
      let reqID = generteID();

      let postEntity = {
        method: "POST",
        headers: headers,
        body: isEncrypt ? _sendData : JSON.stringify(_sendData)
      };

      this.reqQueue[reqID] = fetch(reqUrl, postEntity)
        .then(res => {
          if(res.status == 200) {
            return res.text();
          } else {
            this.reconnect(_sendData, reqUrl, callback);
          }
        })
        .then(resTxt => {
          /**
           * handle res data step
           * 1. 解密
           * 2. 解压
           */
          let decryptData = decryptFilter({data: resTxt, wallet});
          let resDataFilterRes = this.resDataFilter(decryptData, callback);
          if(resDataFilterRes.data) {
            self.changeNetworkState('ok');
            decompressFilter(resDataFilterRes.data)
              .then(decomResData => {
                resDataFilterRes.data = decomResData;
                self.onRes({
                  resData: resDataFilterRes,
                  callback
                })
              });
          } else {
            self.onRes({
              resData: resDataFilterRes,
              callback
            })
          }
          self.reqDone(reqID);
        })
        .catch(err => {
          console.log(`send data fail. url: ${reqUrl}, desc: ${err}.`);
          callFunc(onErr)(err);
          callFunc(self.onErr)(err);
          self.reqDone(reqID);
        });
    }

    /**
     * wrap send data step
     * 1. 压缩 filter
     * 2. 加密 filter
     */
    compressFilter({
      data: sendData.data || sendData.Data,
      compressLenLimit: this.compressLenLimit,
    }).then(compressFilterData => {
      let runningData = Object.assign({}, sendData, compressFilterData);
      // do encrypt filter before send, get the wrap data from outside setting.
      let wrapedData = this._wrapDataBeforeSend(runningData);
      let encryptDataResult = encryptFilter({
        data: wrapedData,
        wallet: wallet,
      });
      send.call(this, encryptDataResult);
    });
  }
  gameGate(sendData, callback, onErr, reqUrl) {
    this._send({
      sendData: sendData,
      reqUrl: reqUrl,
      callback: callback,
      wallet: this.wallet,
      onErr: onErr
    });
  }
}
const $request = new MatrixRequest();

export {
  $request, MatrixRequest
};
