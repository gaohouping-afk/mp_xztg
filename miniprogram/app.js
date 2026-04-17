// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-1gkm0o7a7bdbfe50",
      membersVersion: 0,
      storiesVersion: 0,
      gravesVersion: 0
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },
});
