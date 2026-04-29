const cacheManager = require('../../utils/cacheManager.js')

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
    const { version } = cacheManager.get(cacheManager.keys.stories, app.globalData.familyId)
    const currentVersion = app.globalData.storiesVersion

    if (currentVersion !== version) {
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

    const app = getApp()
    const familyId = app.globalData.familyId

    if (reset) {
      const { data: cached, version } = cacheManager.get(cacheManager.keys.stories, familyId)
      const currentVersion = app.globalData.storiesVersion

      if (cached && cached.length > 0 && version === currentVersion) {
        this.setData({ stories: cached, loading: false })
        return
      }
    }

    this.setData({ loading: true })

    let data = []

    if (familyId) {
      try {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'stories',
            familyId: familyId,
            orderBy: { field: 'yearOrder', order: 'asc' },
            limit: 100
          }
        })

        if (result.result && result.result.success) {
          data = result.result.data
          if (app.globalData.storiesVersion > 0) {
            data = data.sort((a, b) => {
              if (a.yearOrder !== b.yearOrder) {
                return a.yearOrder - b.yearOrder
              }
              return b.createTime - a.createTime
            })
          }
        }
      } catch (e) {
        console.error('loadStories cloud function error:', e)
      }
    } else {
      try {
        const db = wx.cloud.database()
        const res = await db.collection('stories')
          .orderBy('yearOrder', 'asc')
          .orderBy('createTime', 'desc')
          .limit(100)
          .get()
        data = res.data
      } catch (e) {
        console.error('loadStories db error:', e)
      }
    }

    this.setData({
      stories: data,
      loading: false
    })

    cacheManager.set(cacheManager.keys.stories, familyId, data, app.globalData.storiesVersion)
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
    const app = getApp()
    try {
      await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'familyDataRemove',
          collection: 'stories',
          familyId: app.globalData.familyId,
          recordId: id
        }
      })
      wx.showToast({ title: '删除成功' })

      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1

      this.loadStories(true)
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})