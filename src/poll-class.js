export default class PollClass {
  constructor(freq = 2, $request) {
    this.isStarted = false;
    this.pollEntity = null;
    this.freq = freq;
    this.$request = $request;
    this.sendData = {};
  }
  onRes(res) {

  }
  start(sendData) {
    if(this.isStarted) return;
    this.isStarted = true;
    this.sendData = sendData;
    this.polling();
  }
  async polling() {
    if(!this.isStarted) return;
    let res = await $request({sendData});
    this.onRes(res);
    setTimeout(() => this.polling.call(this), this.freq * 1000);
  }
  stop() {
    this.isStarted = false;
  }
}
