const cacheManager = require('../../utils/cacheManager.js')

Page({
  data: {
    userInfo: null,
    currentFamilyName: '',
    currentFamilyId: '',
    myFamilies: [],
    showFamilyPicker: false
  },

  onLoad() {
    this.checkAuth()
    this.initShareMenu()
    this.loadCurrentFamily()
  },

  onShow() {
    this.loadCurrentFamily()
  },

  loadCurrentFamily() {
    const app = getApp()
    const lastFamilyId = wx.getStorageSync('lastFamilyId')
    const lastFamilyName = wx.getStorageSync('lastFamilyName')
    const familyId = lastFamilyId || app.globalData.familyId
    const familyName = lastFamilyName || app.globalData.familyName || ''
    app.globalData.familyId = familyId
    app.globalData.familyName = familyName
    this.setData({
      currentFamilyId: familyId,
      currentFamilyName: familyName
    })
    this.loadMyFamilies()
  },

  async loadMyFamilies() {
    const app = getApp()
    let openid = app.globalData.openid
    if (!openid) {
      try {
        const res = await wx.cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'getOpenId' } })
        openid = res.result?.openid
        if (openid) app.globalData.openid = openid
      } catch (e) {
        console.error('getOpenId error:', e)
        return
      }
    }
    if (!openid) return

    try {
      const db = wx.cloud.database()
      const res = await db.collection('family_members')
        .where({ openid })
        .limit(20)
        .get()

      if (res.data.length === 0) {
        this.setData({ myFamilies: [] })
        return
      }

      const familyIds = res.data.map(m => m.familyId)
      const roleMap = {}
      res.data.forEach(m => { roleMap[m.familyId] = m.role })

      const familiesRes = await db.collection('families')
        .where({
          _id: db.command.in(familyIds)
        })
        .limit(20)
        .get()

      const roleLabels = { owner: '族长', admin: '管理员', member: '成员', viewer: '只读' }
      const myFamilies = familiesRes.data.map(f => ({
        ...f,
        role: roleMap[f._id],
        roleLabel: roleLabels[roleMap[f._id]] || '成员'
      }))

      const app = getApp()
      const lastFamilyId = wx.getStorageSync('lastFamilyId')
      let currentId = lastFamilyId || app.globalData.familyId
      if (!currentId) {
        currentId = app.globalData.defaultFamilyId || (myFamilies.length > 0 ? myFamilies[0]._id : null)
      }
      const current = myFamilies.find(f => f._id === currentId)
      app.globalData.familyId = currentId
      app.globalData.familyName = current ? current.name : ''

      this.setData({
        myFamilies,
        currentFamilyId: currentId,
        currentFamilyName: app.globalData.familyName
      })
    } catch (e) {
      console.error('loadMyFamilies error:', e)
    }
  },

  showFamilySwitcher() {
    this.loadMyFamilies()
    this.setData({ showFamilyPicker: true })
  },

  hideFamilySwitcher() {
    this.setData({ showFamilyPicker: false })
  },

  onFamilySelect(e) {
    const { id } = e.currentTarget.dataset
    const { myFamilies, currentFamilyId } = this.data

    if (id === currentFamilyId) {
      this.setData({ showFamilyPicker: false })
      return
    }

    const selected = myFamilies.find(f => f._id === id)
    if (!selected) return

    const app = getApp()
    app.globalData.familyId = id
    app.globalData.familyName = selected.name
    app.globalData.membersVersion = 0
    app.globalData.gravesVersion = 0
    app.globalData.storiesVersion = 0

    wx.setStorageSync('lastFamilyId', id)
    wx.setStorageSync('lastFamilyName', selected.name)

    wx.showToast({ title: `已切换到${selected.name}`, icon: 'success' })

    this.setData({
      currentFamilyId: id,
      currentFamilyName: selected.name,
      showFamilyPicker: false
    })
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

  onSyncData() {
    wx.showModal({
      title: '刷新数据',
      content: '确定要清理缓存并重新加载吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
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

  goToFamily() {
    wx.navigateTo({ url: '/pages/family/family' })
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
