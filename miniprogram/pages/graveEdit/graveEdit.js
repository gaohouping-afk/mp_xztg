const cacheManager = require('../../utils/cacheManager.js')

const GRAVE_TYPES = [
  { value: 'ancestor', label: '祖先墓', color: '#8B4513' },
  { value: 'clothing', label: '衣冠冢', color: '#A0522D' },
  { value: 'memorial', label: '纪念碑', color: '#D2691E' },
  { value: 'tablet', label: '牌位', color: '#CD853F' },
  { value: 'other', label: '其他', color: '#666666' }
]

Page({
  data: {
    id: '',
    isEdit: false,
    loading: false,
    graveTypes: GRAVE_TYPES,

    selectedMemberId: '',
    selectedMember: null,
    graveType: 'ancestor',
    location: '',
    latitude: '',
    longitude: '',
    description: '',
    photos: [],

    showMemberModal: false,
    members: [],
    filteredMembers: [],
    searchKey: '',
    tempSelectedId: '',

    photosToDelete: []
  },

  onLoad(options) {
    const app = getApp()
    const familyId = app.globalData.familyId

    if (options.memberId) {
      this.setData({ selectedMemberId: options.memberId })
      this.loadMember(options.memberId, familyId)
    }

    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑墓碑' })
      this.loadGrave(options.id, familyId)
    }

    this.loadAllMembers(familyId)
  },

  async loadMember(memberId, familyId) {
    const db = wx.cloud.database()
    try {
      let data = null

      if (familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'members',
            familyId: familyId,
            limit: 100
          }
        })

        if (result.result && result.result.success && result.result.data) {
          data = result.result.data.find(m => m._id === memberId)
        }
      } else {
        const res = await db.collection('members').doc(memberId).get()
        data = res.data
      }

      if (data) {
        this.setData({ selectedMember: data })
      }
    } catch (e) {
      console.error('loadMember error:', e)
    }
  },

  async loadGrave(id, familyId) {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      let data = null

      if (familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'graves',
            familyId: familyId,
            limit: 100
          }
        })

        if (result.result && result.result.success && result.result.data) {
          data = result.result.data.find(g => g._id === id)
        }
      } else {
        const res = await db.collection('graves').doc(id).get()
        data = res.data
      }

      if (data) {
        const photos = await this.convertImagesToTempUrls((data.photos || []).slice())

        let member = null
        if (data.memberId) {
          await this.loadMember(data.memberId, familyId)
          member = this.data.selectedMember
        }

        this.setData({
          selectedMemberId: data.memberId || '',
          selectedMember: member,
          graveType: data.graveType || 'ancestor',
          location: data.location || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          description: data.description || '',
          photos
        })
      }
    } catch (e) {
      console.error('loadGrave error:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
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

  async loadAllMembers(familyId) {
    const db = wx.cloud.database()
    try {
      let allMembers = []
      let skip = 0
      let hasMore = true

      while (hasMore) {
        if (familyId) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'quickstartFunctions',
              data: {
                type: 'familyDataQuery',
                collection: 'members',
                familyId: familyId,
                orderBy: { field: 'generation', order: 'asc' },
                skip: skip,
                limit: 20
              }
            })

            if (result.result && result.result.success && result.result.data) {
              allMembers = [...allMembers, ...result.result.data]
              hasMore = result.result.data.length === 20
            } else {
              hasMore = false
            }
          } catch (e) {
            console.error('loadAllMembers cloud function error:', e)
            hasMore = false
          }
        } else {
          const { data } = await db.collection('members')
            .orderBy('generation', 'asc')
            .skip(skip)
            .limit(20)
            .get()

          if (data.length > 0) {
            allMembers = [...allMembers, ...data]
          }
          hasMore = data.length === 20
        }

        skip += 20
      }

      this.setData({
        members: allMembers,
        filteredMembers: allMembers
      })
    } catch (e) {
      console.error('loadAllMembers error:', e)
    }
  },

  showMemberPicker() {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    this.setData({
      showMemberModal: true,
      tempSelectedId: this.data.selectedMemberId,
      filteredMembers: this.data.members,
      searchKey: ''
    })
  },

  hideMemberPicker() {
    this.setData({ showMemberModal: false })
  },

  onMemberSearch(e) {
    const key = e.detail.value.toLowerCase().trim()
    const { members } = this.data

    const filtered = members.filter(m => {
      return !key || m.name.toLowerCase().includes(key)
    })

    this.setData({
      searchKey: key,
      filteredMembers: filtered
    })
  },

  onMemberSelect(e) {
    const { id } = e.currentTarget.dataset
    const member = this.data.members.find(m => m._id === id)

    this.setData({
      selectedMemberId: id,
      selectedMember: member,
      showMemberModal: false
    })
  },

  onConfirmMember() {
    const member = this.data.members.find(m => m._id === this.data.tempSelectedId)

    this.setData({
      selectedMemberId: this.data.tempSelectedId,
      selectedMember: member,
      showMemberModal: false
    })
  },

  confirmMember() {
    const { tempSelectedId, members } = this.data
    const member = members.find(m => m._id === tempSelectedId)

    this.setData({
      selectedMemberId: tempSelectedId,
      selectedMember: member || null,
      showMemberModal: false
    })
  },

  onCancel() {
    wx.navigateBack()
  },

  onTypeChange(e) {
    this.setData({ graveType: e.detail.value })
  },

  onTypeSelect(e) {
    this.setData({ graveType: e.currentTarget.dataset.value })
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value })
  },

  onGetWGS84Location() {
    wx.getLocation({
      type: 'wgs84',
      isHighAccuracy: true,
      success: (res) => {
        const { latitude, longitude, accuracy } = res
        this.setData({
          latitude: String(latitude),
          longitude: String(longitude)
        })
        if (!this.data.location) {
          this.setData({ location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` })
        }

        let accuracyLevel = ''
        let accuracyDesc = ''
        if (accuracy < 10) {
          accuracyLevel = '优秀'
          accuracyDesc = '精度非常高，位置准确'
        } else if (accuracy < 20) {
          accuracyLevel = '良好'
          accuracyDesc = '精度较好，满足日常使用'
        } else {
          accuracyLevel = '一般'
          accuracyDesc = '精度较低，可到室外空旷处重新获取'
        }

        wx.showModal({
          title: `位置获取成功 (精度:${accuracy.toFixed(0)}m)`,
          content: `评价：${accuracyLevel}\n\n${accuracyDesc}\n\n如需更高精度，建议使用专业测量软件测量后手动填入经纬度。`,
          confirmText: '知道了',
          showCancel: false,
          success: (modalRes) => {
            if (modalRes.confirm) {
              console.log('位置已获取', { latitude, longitude, accuracy })
            }
          }
        })
      },
      fail: (e) => {
        console.error('getLocation error:', e)
        if (e.errMsg && e.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限以便获取墓碑坐标',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({ title: '获取位置失败', icon: 'none' })
        }
      }
    })
  },

  onClearCoords() {
    this.setData({
      latitude: '',
      longitude: ''
    })
  },

  onLatitudeInput(e) {
    this.setData({ latitude: e.detail.value })
  },

  onLongitudeInput(e) {
    this.setData({ longitude: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onAddPhoto() {
    wx.chooseImage({
      count: 9 - this.data.photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadPhotos(res.tempFilePaths)
      }
    })
  },

  async uploadPhotos(tempPaths) {
    wx.showLoading({ title: '上传中...' })

    const uploadedPaths = []
    const cloudPaths = []

    for (const path of tempPaths) {
      try {
        const ext = path.match(/\.[^.]+$/)?.[0] || '.jpg'
        const cloudPath = `graves/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`

        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: path
        })

        uploadedPaths.push(uploadRes.fileID)
        cloudPaths.push(uploadRes.fileID)
      } catch (e) {
        console.error('upload error:', e)
      }
    }

    wx.hideLoading()

    if (uploadedPaths.length > 0) {
      const photos = [...this.data.photos, ...uploadedPaths]
      this.setData({ photos })
    }
  },

  onPreviewPhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = this.data.photos

    const httpPhotos = photos.map(p => {
      if (p.startsWith('cloud://')) {
        return p
      }
      return p
    })

    wx.previewImage({
      current: httpPhotos[index],
      urls: httpPhotos
    })
  },

  onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset
    const { photos } = this.data
    const deletedPhoto = photos[index]

    photos.splice(index, 1)
    this.setData({ photos })

    if (deletedPhoto && !deletedPhoto.startsWith('http')) {
      const photosToDelete = [...this.data.photosToDelete, deletedPhoto]
      this.setData({ photosToDelete })
    }
  },

  async onSave() {
    const { selectedMemberId, graveType, location, latitude, longitude, description, photos, isEdit, id } = this.data

    if (!selectedMemberId) {
      wx.showToast({ title: '请选择关联成员', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    const app = getApp()
    try {
      const dataToSave = {
        memberId: selectedMemberId,
        graveType,
        location,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        description,
        photos
      }

      if (isEdit) {
        await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataUpdate',
            collection: 'graves',
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
            collection: 'graves',
            familyId: app.globalData.familyId,
            data: { ...dataToSave, visitCount: 0 }
          }
        })
      }

      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1
      cacheManager.invalidate(cacheManager.keys.graves)

      wx.showToast({ title: '保存成功' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (e) {
      console.error('saveGrave error:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  preventScroll() {
    return false
  }
})