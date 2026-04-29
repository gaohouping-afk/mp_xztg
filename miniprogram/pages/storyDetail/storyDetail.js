Page({
  data: {
    story: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.data.storyId = options.id
      this.loadStory(options.id)
    }
  },

  onShow() {
    if (this.data.storyId) {
      this.loadStory(this.data.storyId)
    }
  },

  async loadStory(id) {
    this.setData({ loading: true })

    const app = getApp()
    const familyId = app.globalData.familyId
    let data = null

    try {
      if (familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'stories',
            familyId: familyId,
            limit: 100
          }
        })
        if (result.result && result.result.success && result.result.data) {
          data = result.result.data.find(s => s._id === id)
        }
      } else {
        const db = wx.cloud.database()
        const res = await db.collection('stories').doc(id).get()
        data = res.data
      }
    } catch (e) {
      console.error('loadStory error:', e)
    }

    if (data) {
      const images = await this.convertImagesToTempUrls(data.images || [])
      data.images = images
      this.setData({ story: data, loading: false })
    } else {
      this.setData({ loading: false })
    }
  },

  async convertImagesToTempUrls(images) {
    if (!images || images.length === 0) return []

    const cloudImages = images.filter(img => img && !img.startsWith('http'))
    if (cloudImages.length === 0) return [...images]

    try {
      const res = await wx.cloud.getTempFileURL({ fileList: cloudImages })
      if (res.fileList) {
        const urlMap = {}
        res.fileList.forEach((item, index) => {
          if (item.tempFileURL && cloudImages[index]) {
            urlMap[cloudImages[index]] = item.tempFileURL
          }
        })

        return images.map(img => urlMap[img] || img)
      }
    } catch (e) {
      console.error('convertImagesToTempUrls error:', e)
    }

    return [...images]
  },

  onEdit() {
    wx.navigateTo({
      url: `/pages/storyEdit/storyEdit?id=${this.data.story._id}`
    })
  }
})
