/**
 * 这里是根据具体业务的 filter 函数集
 */
import {$request, PollClass} from 'uke-request';
import {getUserInfo, getSessID, onLoginFail} from 'matrix-user-authenticator-actions';

function getUserName() {
  return getUserInfo().UserName || window.$GH.GenerteID();
}

/**
 * 获取全局的请求的 header
 */
function getCommonHeader() {
  let reqHeader = {
    SessId: getSessID(),
    UserName: getUserName(),
    Platform: window.PLATFORM,
    Device: window.DEVICE,
  };

  window.COMMON_REQ_HEADER = reqHeader;
  return reqHeader;
}

/**
 * 订阅 $request response 事件
 */
function handleRes({resData, callback}) {
  let errcode = resData.Header.ErrCode;
  switch (errcode.Code) {
    case '30003':
    case '30024':
    case '30039':
      // TODO 处理登录错误的业务
      onLoginFail(errcode.Desc);
      break;
  }
}

/**
 * $request send data 前的 wrapper 函数
 */
$request.wrapDataBeforeSend = (options) => {
  const {isCompress, method, data, params} = options;
  return {
    Header: Object.assign({}, getCommonHeader(data), {
      Compress: isCompress ? 1 : 0,
      Method: method,
    }, params),
    Data: data
  }
}

/**
 * 当 $request 有相应时，返回
 */
$request.setResDataHook = (resData) => {
  resData.data = resData.Data || {};
  resData.isCompress = resData.Header.Compress || false;
  return resData;
}

/**
 * 监听 $request res 处理函数
 */
$request.subscribeRes(handleRes);

/**
 * 轮询对象的设置
 */
const PollingEntity = new PollClass(2);
PollingEntity.setReqObj($request);

export {
  $request, PollingEntity
};
