Page({
  data: {
    stories: [],
    loading: true
  },

  onLoad() {
    this.loadStories(true)
  },

  onShow() {
    const app = getApp()
    const versionKey = 'story_version'
    const cachedVersion = wx.getStorageSync(versionKey)
    const currentVersion = app.globalData.storiesVersion
    
    if (currentVersion !== cachedVersion) {
      this.loadStories(true)
    }
  },

  onPullDownRefresh() {
    this.loadStories(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  formatYear(story) {
    if (story.yearOrder < 0) {
      return `公元前${Math.abs(story.yearOrder)}年`
    } else if (story.yearOrder > 0) {
      return `公元${story.yearOrder}年`
    } else {
      return story.year || ''
    }
  },

  async loadStories(reset = false) {
    if (this.data.loading && !reset) return
    
    const cacheKey = 'story_stories'
    const versionKey = 'story_version'
    const app = getApp()
    
    if (reset) {
      const cached = wx.getStorageSync(cacheKey)
      const cachedVersion = wx.getStorageSync(versionKey)
      const currentVersion = app.globalData.storiesVersion
      
      if (cached && cached.length > 0 && cachedVersion === currentVersion && currentVersion > 0) {
        this.setData({ stories: cached, loading: false })
        return
      } else if (cached && cached.length > 0 && currentVersion === 0) {
        this.setData({ stories: cached, loading: false })
        return
      }
    }
    
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    const { data } = await db.collection('stories').orderBy('yearOrder', 'asc').orderBy('createTime', 'desc').get()
    
    this.setData({
      stories: data,
      loading: false
    })
    
    wx.setStorageSync(versionKey, app.globalData.storiesVersion)
    wx.setStorageSync(cacheKey, data)
  },

  onStoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/storyDetail/storyDetail?id=${id}`
    })
  },

  onAddStory() {
    wx.navigateTo({
      url: '/pages/storyEdit/storyEdit'
    })
  },

  onDeleteStory(e) {
    const { id } = e.currentTarget.dataset
    const that = this
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇迁徙故事吗？',
      success(res) {
        if (res.confirm) {
          that.deleteStory(id)
        }
      }
    })
  },

  async deleteStory(id) {
    try {
      const db = wx.cloud.database()
      await db.collection('stories').doc(id).remove()
      wx.showToast({ title: '删除成功' })
      
      const app = getApp()
      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1
      
      this.loadStories(true)
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})
