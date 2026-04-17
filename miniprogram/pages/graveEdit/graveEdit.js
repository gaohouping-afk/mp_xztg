const GRAVE_TYPES = [
  { value: 'ancestor', label: '祖先墓', color: '#8B4513' },
  { value: 'clothing', label: '衣冠冢', color: '#A0522D' },
  { value: 'memorial', label: '纪念碑', color: '#D2691E' },
  { value: 'tablet', label: '牌位', color: '#CD853F' },
  { value: 'other', label: '其他', color: '#666666' }
]

const CACHE_KEY = 'member_members'
const VERSION_KEY = 'member_version'

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
    if (options.memberId) {
      this.setData({ selectedMemberId: options.memberId })
      this.loadMember(options.memberId)
    }

    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑墓碑' })
      this.loadGrave(options.id)
    }

    this.loadAllMembers()
  },

  async loadMember(memberId) {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('members').doc(memberId).get()
      if (data) {
        this.setData({ selectedMember: data })
      }
    } catch (e) {
      console.error('loadMember error:', e)
    }
  },

  async loadGrave(id) {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('graves').doc(id).get()

      if (data) {
        const photos = await this.convertImagesToTempUrls(data.photos || [])

        let member = null
        if (data.memberId) {
          try {
            const memberRes = await db.collection('members').doc(data.memberId).get()
            member = memberRes.data
          } catch (e) {
            console.error('load member error:', e)
          }
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

  async loadAllMembers() {
    const membersCache = wx.getStorageSync(CACHE_KEY) || []
    const cachedVersion = wx.getStorageSync(VERSION_KEY)
    const app = getApp()
    const currentVersion = app.globalData.membersVersion || 0

    if (membersCache.length > 0 && cachedVersion === currentVersion) {
      this.setData({
        members: membersCache,
        filteredMembers: membersCache
      })
      return
    }

    const db = wx.cloud.database()
    try {
      let allMembers = []
      let skip = 0
      let hasMore = true

      while (hasMore) {
        const { data } = await db.collection('members')
          .orderBy('generation', 'asc')
          .skip(skip)
          .limit(20)
          .get()

        if (data.length > 0) {
          allMembers = [...allMembers, ...data]
          skip += 20
        }

        hasMore = data.length === 20
      }

      wx.setStorageSync(CACHE_KEY, allMembers)
      wx.setStorageSync(VERSION_KEY, currentVersion)

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
    const { id, name } = e.currentTarget.dataset
    const { members } = this.data
    const member = members.find(m => m._id === id)

    this.setData({
      selectedMemberId: id,
      selectedMember: member || null,
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

  onTypeSelect(e) {
    this.setData({ graveType: e.currentTarget.dataset.value })
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (res.name || res.address) {
          this.setData({
            location: res.address || res.name,
            latitude: res.latitude,
            longitude: res.longitude
          })
        }
      },
      fail: (e) => {
        console.error('chooseLocation error:', e)
        wx.showToast({ title: '请检查位置权限', icon: 'none' })
      }
    })
  },

  onLatitudeInput(e) {
    this.setData({ latitude: e.detail.value })
  },

  onLongitudeInput(e) {
    this.setData({ longitude: e.detail.value })
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

    try {
      const db = wx.cloud.database()
      const now = db.serverDate()

      const dataToSave = {
        memberId: selectedMemberId,
        graveType,
        location,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        description,
        photos,
        updateTime: now
      }

      if (isEdit) {
        await db.collection('graves').doc(id).update({
          data: dataToSave
        })
      } else {
        dataToSave.createTime = now
        dataToSave.visitCount = 0
        await db.collection('graves').add({
          data: dataToSave
        })
      }

      const app = getApp()
      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1

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
