Page({
  data: {
    version: '1.0.2'
  },

  onContact() {
    wx.openCustomerServiceChat({
      bizId: '', // 需要在微信公众平台配置客服账号
      success: () => {
        console.log('打开客服成功')
      },
      fail: (e) => {
        console.error('openCustomerServiceChat error:', e)
        wx.showToast({
          title: '请在微信公众平台配置客服账号',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }
})