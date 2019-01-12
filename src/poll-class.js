/**
 * 轮询包装类
 *
 * @class PollClass
 */
class PollClass {
  constructor(freq = 2, $request) {
    this.isStarted = false;
    this.pollEntity = null;
    this.freq = freq;
    this.$request = $request;
    this.sendData = {};
  }
  onRes(res) {

  }
  /**
   * 轮询开始
   *
   * @param {object} sendData
   * @returns {void}
   * @memberof PollClass
   */
  start(sendData) {
    if(this.isStarted) return;
    this.isStarted = true;
    this.sendData = sendData;
    this.polling();
  }
  /**
   * 轮询
   *
   * @returns {void}
   * @memberof PollClass
   */
  async polling() {
    if(!this.isStarted) return;
    let res = await $request({sendData});
    this.onRes(res);
    setTimeout(() => this.polling.call(this), this.freq * 1000);
  }
  /**
   * 停止轮询
   *
   * @memberof PollClass
   */
  stop() {
    this.isStarted = false;
  }
}
export default PollClass;