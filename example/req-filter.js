/**
 * 这里是根据具体业务的 filter 函数集
 */
import { RequestClass } from '@mini-code/request';
import { getUserInfo, getSessID, onLoginFail } from ".";

const $R = new RequestClass();

function getUserName() {
  return getUserInfo().UserName || window.$GH.GenerteID();
}

/**
 * 获取全局的请求的 header
 */
function getCommonHeader() {
  const reqHeader = {
    SessId: getSessID(),
    UserName: getUserName(),
    Platform: window.PLATFORM,
    Device: window.DEVICE,
  };

  window.COMMON_REQ_HEADER = reqHeader;
  return reqHeader;
}

/**
 * 订阅 $R response 事件
 */
function handleRes({ resData, callback }) {
  const errcode = resData.Header.ErrCode;
  switch (errcode.Code) {
    case '1':
    case '2':
    case '3':
      // TODO 处理登录错误的业务
      onLoginFail(errcode.Desc);
      break;
  }
}

/**
 * $R send data 前的 wrapper 函数
 */
const before = (options) => {
  const {
    isCompress, method, data, params
  } = options;
  return {
    Header: Object.assign({}, getCommonHeader(data), {
      Compress: isCompress ? 1 : 0,
      Method: method,
    }, params),
    Data: data
  };
};

/**
 * 当 $R 有相应时，返回
 */
const after = (resData) => {
  resData.data = resData.Data || {};
  resData.isCompress = resData.Header.Compress || false;
  return resData;
};

$R.use([before, after]);

/**
 * 监听 $R res 处理函数
 */
$R.on(handleRes);

export {
  $R, PollingEntity
};
