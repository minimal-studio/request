const defaultPollData = {
  Params: []
};
/**
 * 轮询模块
 * 
 * @example
 * const pollEntity = new PollMethod(pollFreq); [pollFreq 为轮询一次的频率，单位为秒]
 * pollEntity.onRes = pollHandle;
 * pollEntity.setPollConfig({
 *   [pollItemName]: {
 *     freq: 1 [freq 轮询的频率，例如设置为 1，即基于上面的 2 秒一次的轮询每次都执行]
 *   },
 *   getData: function() {
 *     return {
 *
 *     }
 *   }
 * })
 * 定义回调函数
 * function pollHandle(res) {
 * const {resData, api, id} = res;
 *   switch(api || id) {
 *     case [id]:
 *       [handle]
 *   }
 * }
 *
 * 定义 config
 * let pollConfig = {
 * ID: {
 *    freq: 1,
 *    callback: pollHandle,
 *    api: APIS.QUERY_USER_FOR_POLLING, // 必须的
 *    getData() {                       // 必须的
 *      return {
 *        data
 *      };
 *    }
 *  }
 *};
 *
 * new 一个轮询对象
 * const PollingEntity = new PollMethod(freq = 2);
 *
 * 把 config 传给这个对象
 * PollingEntity.addConfig(pollConfig);
 * PollingEntity.removeConfig(ID);     ID 可以为 [id1, id2] 也可以为字符串 id
 *
 * 开始轮询
 * PollingEntity.start();
 *
 * 停止轮询
 * PollingEntity.stop()
 *
 * @class PollMethod
 */
class PollMethod {
  constructor(pollFreq = 2, pollMethod = 'poll', defaultPollData = defaultPollData) {
    // super();

    this.pollFreq = pollFreq * 1000;
    this.pollTime = 0;
    this.pollData = {
      method: pollMethod,
      data: defaultPollData
    };
    this.pollUrl = '';
    this.timer = null;
    this.isStarted = false;

    this.callbackQueue = {};

    /**
     * 轮询数据, key 为数据的 ID, value 为轮询数据结构
     * this.pollDataSet = {
     *   [pollDataID]: {
     *     freq: number 该条数据的轮询次数频率, 轮询基础频率为 2 秒一次, 如果填写 10 , 即 10 次 2 秒的轮询以轮到该方法
     *     data: Object 该条数据的实际请求体 {
     *       Header: {},
     *       Data  : function 生成请求数据
     *     }
     *   }
     * }
     */
    this.pollDataSet = {};
  }
  /**
   * 轮询开始
   *
   * @memberof PollMethod
   */
  start() {
    if(!this.isStarted && this.checkConfig()) {
      this.pollTime = 1;
      this.startPoll();
      this.isStarted = true;
    }
  }
  /**
   * 检查配置是否符合预期
   *
   * @returns {boolen} 是否符合预期
   * @memberof PollMethod
   */
  checkConfig() {
    let isPass = false;
    switch (true) {
    case !this.$request:
      console.log('please call setReqObj($request)');
      break;
    case !this.pollUrl:
      console.log('please call setPollUrl(pollUrl)');
      break;
    default:
      isPass = true;
    }
    return isPass;
  }
  /**
   * 设置轮询用到的请求对象
   *
   * @param {$request} reqObj 请求对象，可以使用 $request
   * @memberof PollMethod
   */
  setReqObj(reqObj) {
    this.$request = reqObj;
  }
  /**
   * 设置轮询地址
   *
   * @param {string} url 地址
   * @memberof PollMethod
   */
  setPollUrl(url) {
    this.pollUrl = url;
  }
  /**
   * 设置轮询的数据配置
   *
   * @param {object} config
   * @returns {void}
   * @memberof PollMethod
   */
  setPollConfig(config) {
    if (typeof config != 'object') return console.error('this interface expect parameter of Object');
    this.pollDataSet = config;
  }
  /**
   * 往已存在的轮询数据配置中添加数据配置
   *
   * @param {object} config
   * @memberof PollMethod
   */
  addConfig(config) {
    Object.assign(this.pollDataSet, config);
  }
  /**
   * 移除轮询数据配置
   *
   * @param {string} key 配置的 key
   * @memberof PollMethod
   */
  removeConfig(key) {
    let keyArr = Array.isArray(key) ? key : [key];
    keyArr.forEach(item => delete this.pollDataSet[item]);
  }
  /**
   * 开始轮询
   *
   * @memberof PollMethod
   */
  startPoll() {
    // let self = this;
    // this.timer = setTimeout(() => {
    //   self.startPolling();
    // }, this.pollFreq);
    this.polling();
  }
  /**
   * 等待上一个轮询结束后再次发起下一个轮询
   *
   * @returns {void}
   * @memberof PollMethod
   */
  _loopPollWhenReqDone() {
    if(!this.isStarted) return;
    this.timer = setTimeout(() => {
      this.polling();
    }, this.pollFreq);
  }
  /**
   * 封装轮询请求数据
   *
   * @returns {object}
   * @memberof PollMethod
   */
  _wrapPollData() {
    let allPollConfig = [];
    let configIdConfigMapper = {};
    this.pollTime += 1;
    for (var configID in this.pollDataSet) {
      let currConfig = this.pollDataSet[configID];
      let currData = currConfig.getData();
      if (!!currData && (this.pollTime == 0 || this.pollTime % currConfig.freq == 0)) {
        allPollConfig.push(currData);
        configIdConfigMapper[currConfig.api] = Object.assign({}, currConfig, {id: configID});
      }
    }
    return {allPollConfig, configIdConfigMapper};
  }
  /**
   * 轮询中的接口
   *
   * @returns {object}
   * @memberof PollMethod
   */
  wrapData(allPollConfig) {
    return {
      data: {
        Params: allPollConfig
      }
    };
  }
  async sendData(_pollData) {
    return await this.$request.send({
      sendData: _pollData, url: this.pollUrl
    });
  }
  async polling() {
    const pollDataParams = this._wrapPollData(); // 获取轮询的参数
    const { allPollConfig, configIdConfigMapper } = pollDataParams;
    if (allPollConfig.length == 0) return; // 如果没有参数, 就不发起请求轮询
    let _pollData = Object.assign({}, this.pollData, this.wrapData(allPollConfig));

    const sendResData = await this.sendData(_pollData);

    let data = sendResData.data;
    for (var dataKey in data) {
      let configMapped = configIdConfigMapper[dataKey];
      if(configMapped && configMapped.callback && typeof configMapped.callback == 'function') {
        configMapped.callback({
          resData: data[dataKey],
          api: dataKey,
          id: configMapped.id,
          config: configMapped
        });
      }
    }
    this._loopPollWhenReqDone();
  }
  /**
   * 停止轮询
   *
   * @memberof PollMethod
   */
  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.isStarted = false;
  }
}
export default PollMethod;