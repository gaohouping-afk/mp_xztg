Page({
  data: {
    userInfo: null
  },

  onLoad() {
    this.checkAuth()
    this.initShareMenu()
  },

  initShareMenu() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShareAppMessage(res) {
    return {
      title: '寻公问祖 - 家族族谱小程序',
      desc: '追溯根源，铭记先祖。一个基于微信云开发的家族族谱管理小程序。',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '寻公问祖 - 家族族谱小程序',
      desc: '追溯根源，铭记先祖',
      query: ''
    }
  },

  checkAuth() {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.setData({ userInfo: res.userInfo })
            }
          })
        }
      }
    })
  },

  getUserInfo(e) {
    if (e.detail.userInfo) {
      this.setData({ userInfo: e.detail.userInfo })
    }
  },

  goToFamilyTree() {
    wx.navigateTo({ url: '/pages/familyTree/familyTree' })
  },

  goToAddTestData() {
    wx.navigateTo({ url: '/pages/addTestData/addTestData' })
  },

  goToMember() {
    wx.navigateTo({ url: '/pages/member/member' })
  },

  goToStory() {
    wx.navigateTo({ url: '/pages/story/story' })
  },

  goToGrave() {
    wx.navigateTo({ url: '/pages/grave/grave' })
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  async initDatabase() {
    wx.showLoading({ title: '初始化中...' })
    
    try {
      const result = await wx.cloud.callFunction({ name: 'initDB' })
      wx.hideLoading()
      
      if (result.result.success) {
        wx.showToast({ title: '初始化成功' })
      } else {
        wx.showToast({ title: '初始化完成', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '初始化失败', icon: 'none' })
    }
  },

  async clearAllData() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理所有族谱数据吗？此操作不可恢复！',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          try {
            const db = wx.cloud.database()
            
            const deleteCollection = async (collectionName) => {
              let deletedCount = 0
              let hasMore = true
              
              while (hasMore) {
                const { data } = await db.collection(collectionName).limit(20).get()
                
                if (data.length === 0) {
                  hasMore = false
                  break
                }
                
                for (const item of data) {
                  await db.collection(collectionName).doc(item._id).remove()
                  deletedCount++
                }
                
                if (data.length < 20) {
                  hasMore = false
                }
              }
              
              return deletedCount
            }
            
            const membersCount = await deleteCollection('members')
            const storiesCount = await deleteCollection('stories')
            
            wx.clearStorageSync()
            
            const app = getApp()
            app.globalData.membersVersion = 0
            app.globalData.storiesVersion = 0
            
            wx.hideLoading()
            wx.showToast({ 
              title: `清理完成（成员${membersCount}条，故事${storiesCount}条）`,
              icon: 'none',
              duration: 3000
            })
          } catch (e) {
            wx.hideLoading()
            wx.showToast({ title: '清理失败', icon: 'none' })
            console.error('clear data error:', e)
          }
        }
      }
    })
  }
})
