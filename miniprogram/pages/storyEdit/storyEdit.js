const cacheManager = require('../../utils/cacheManager.js')

Page({
  data: {
    id: '',
    title: '',
    year: '',
    yearEra: '1',
    yearEraOptions: [
      { value: '1', name: '公元' },
      { value: '-1', name: '公元前' }
    ],
    location: '',
    description: '',
    content: '',
    relatedMembers: '',
    images: [],
    imagesToSave: [],
    imagesToDelete: [],
    isEdit: false,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      this.loadStory(options.id)
    }
  },

  async loadStory(id) {
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
      const originalImages = (data.images || []).slice()
      const images = await this.convertImagesToTempUrls(originalImages)

      let yearEra = '1'
      if (data.yearOrder < 0) {
        yearEra = '-1'
      }

      this.setData({
        title: data.title || '',
        year: data.year || '',
        yearEra: yearEra,
        location: data.location || '',
        description: data.description || '',
        content: data.content || '',
        relatedMembers: data.relatedMembers || '',
        images: images,
        imagesToSave: originalImages
      })
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

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onYearInput(e) {
    this.setData({ year: e.detail.value })
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onRelatedMembersInput(e) {
    this.setData({ relatedMembers: e.detail.value })
  },

  onYearEraChange(e) {
    const index = parseInt(e.detail.value)
    const options = this.data.yearEraOptions
    this.setData({ yearEra: options[index].value })
  },

  async onChooseImages() {
    const res = await wx.chooseImage({ count: 9 - this.data.images.length, sizeType: ['compressed'] })
    if (res.tempFilePaths.length > 0) {
      wx.showLoading({ title: '上传中...' })

      const newImages = [...this.data.images]
      const newImagesToSave = [...this.data.imagesToSave]

      for (const filePath of res.tempFilePaths) {
        const cloudPath = `stories/${Date.now()}-${Math.random()}.${filePath.split('.').pop()}`

        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath
          })

          const tempRes = await wx.cloud.getTempFileURL({
            fileList: [uploadRes.fileID]
          })

          if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
            newImages.push(tempRes.fileList[0].tempFileURL)
            newImagesToSave.push(uploadRes.fileID)
          } else {
            newImages.push(uploadRes.fileID)
            newImagesToSave.push(uploadRes.fileID)
          }
        } catch (e) {
          console.error('Upload failed:', e)
        }
      }

      this.setData({ images: newImages, imagesToSave: newImagesToSave })
      wx.hideLoading()
    }
  },

  onRemoveImage(e) {
    const { index } = e.currentTarget.dataset
    const newImages = [...this.data.images]
    const newImagesToSave = [...this.data.imagesToSave]
    const removedImage = newImagesToSave[index]

    newImages.splice(index, 1)
    newImagesToSave.splice(index, 1)

    let newImagesToDelete = [...this.data.imagesToDelete]
    if (removedImage && !removedImage.startsWith('http')) {
      newImagesToDelete.push(removedImage)
    }

    this.setData({
      images: newImages,
      imagesToSave: newImagesToSave,
      imagesToDelete: newImagesToDelete
    })
  },

  async onSave() {
    const { title, year, yearEra, location, description, content, relatedMembers, imagesToSave, imagesToDelete, id, isEdit, loading } = this.data

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    if (loading) return

    this.setData({ loading: true })

    const app = getApp()
    const yearNum = parseInt(year) || 0
    const yearOrder = yearNum * parseInt(yearEra)

    const dataToSave = {
      title: title.trim(),
      year,
      yearOrder: yearOrder,
      location,
      description,
      content,
      relatedMembers,
      images: imagesToSave
    }

    try {
      if (isEdit) {
        await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataUpdate',
            collection: 'stories',
            familyId: app.globalData.familyId,
            recordId: id,
            data: dataToSave
          }
        })
      } else {
        await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataAdd',
            collection: 'stories',
            familyId: app.globalData.familyId,
            data: dataToSave
          }
        })
      }

      for (const img of imagesToDelete) {
        try {
          await wx.cloud.deleteFile({ fileList: [img] })
        } catch (e) {
          console.error('delete image error:', e)
        }
      }

      wx.showToast({ title: '保存成功' })

      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1
      cacheManager.invalidate(cacheManager.keys.stories)

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (e) {
      console.error('saveStory error:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})