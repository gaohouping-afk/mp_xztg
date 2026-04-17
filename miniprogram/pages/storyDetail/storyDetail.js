Page({
  data: {
    story: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadStory(options.id)
    }
  },

  async loadStory(id) {
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    const { data } = await db.collection('stories').doc(id).get()
    
    const images = await this.convertImagesToTempUrls(data.images || [])
    data.images = images
    
    this.setData({
      story: data,
      loading: false
    })
  },

  async convertImagesToTempUrls(images) {
    if (!images || images.length === 0) return []
    
    const cloudImages = images.filter(img => img && !img.startsWith('http'))
    if (cloudImages.length === 0) return images
    
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
    
    return images
  },

  onEdit() {
    wx.navigateTo({
      url: `/pages/storyEdit/storyEdit?id=${this.data.story._id}`
    })
  }
})
