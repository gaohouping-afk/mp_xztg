const GRAVE_TYPES = [
  { value: 'ancestor', label: '祖先墓', color: '#8B4513' },
  { value: 'clothing', label: '衣冠冢', color: '#A0522D' },
  { value: 'memorial', label: '纪念碑', color: '#D2691E' },
  { value: 'tablet', label: '牌位', color: '#CD853F' },
  { value: 'other', label: '其他', color: '#666666' }
]

function transformLat(x, y) {
  const PI = 3.1415926535897932384626
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLng(x, y) {
  const PI = 3.1415926535897932384626
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

function wgs84ToGCJ02(wgsLat, wgsLng) {
  const PI = 3.1415926535897932384626
  const a = 6378245.0
  const ee = 0.00669342162296594323
  
  let dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0)
  let dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0)
  const radLat = wgsLat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI)
  return {
    lat: wgsLat + dLat,
    lng: wgsLng + dLng
  }
}

Page({
  data: {
    grave: null,
    member: null,
    loading: true,
    showVisitModal: false,
    editVisitDate: '',
    editVisitTime: '',
    editVisitCount: 0,
    showMoreSheet: false,
    sheetAnimated: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadGrave(options.id)
    }
  },

  onShow() {
    if (this.data.id) {
      this.loadGrave(this.data.id)
    }
  },

  async loadGrave(id) {
    this.setData({ loading: true })

    const db = wx.cloud.database()

    try {
      const { data } = await db.collection('graves').doc(id).get()

      if (data) {
        const typeInfo = GRAVE_TYPES.find(t => t.value === data.graveType) || GRAVE_TYPES[4]

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
          grave: {
            ...data,
            photos,
            typeLabel: typeInfo.label,
            typeColor: typeInfo.color
          },
          member,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '墓碑不存在', icon: 'none' })
      }
    } catch (e) {
      console.error('loadGrave error:', e)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
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
      url: `/pages/graveEdit/graveEdit?id=${this.data.grave._id}`
    })
  },

  onDelete() {
    const that = this

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该墓碑记录吗？此操作不可恢复',
      success(res) {
        if (res.confirm) {
          that.deleteGrave()
        }
      }
    })
  },

  async deleteGrave() {
    try {
      const db = wx.cloud.database()
      await db.collection('graves').doc(this.data.grave._id).remove()

      const app = getApp()
      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1

      wx.showToast({ title: '删除成功' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (e) {
      console.error('deleteGrave error:', e)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  onMoreTap() {
    this.setData({ showMoreSheet: true })
    setTimeout(() => {
      this.setData({ sheetAnimated: true })
    }, 10)
  },

  onCloseSheet() {
    this.setData({ sheetAnimated: false })
    setTimeout(() => {
      this.setData({ showMoreSheet: false })
    }, 300)
  },

  onNavigate() {
    const { grave } = this.data
    if (!grave.latitude || !grave.longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' })
      return
    }

    const wgsLat = parseFloat(grave.latitude)
    const wgsLng = parseFloat(grave.longitude)
    
    const gcjCoords = wgs84ToGCJ02(wgsLat, wgsLng)
    
    wx.openLocation({
      latitude: gcjCoords.lat,
      longitude: gcjCoords.lng,
      name: grave.location || '墓碑位置',
      address: grave.location || ''
    })
  },

  onCopyCoords() {
    const { grave } = this.data
    if (!grave.latitude || !grave.longitude) {
      wx.showToast({ title: '暂无坐标信息', icon: 'none' })
      return
    }

    const coords = `${grave.latitude},${grave.longitude}`
    wx.setClipboardData({
      data: coords,
      success: () => {
        wx.showToast({ title: '坐标已复制' })
      }
    })
  },

  onPreviewPhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = this.data.grave.photos || []

    wx.previewImage({
      current: photos[index],
      urls: photos
    })
  },

  onRecordVisit() {
    const { grave } = this.data

    wx.showModal({
      title: '记录扫墓',
      content: '确认已到此墓碑祭扫？',
      confirmText: '确认',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            const now = new Date()
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

            await db.collection('graves').doc(grave._id).update({
              data: {
                visitDate: dateStr,
                visitTime: timeStr,
                visitCount: (grave.visitCount || 0) + 1,
                updateTime: db.serverDate()
              }
            })

            const app = getApp()
            app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1

            wx.showToast({ title: '已记录扫墓' })

            this.loadGrave(grave._id)
          } catch (e) {
            console.error('recordVisit error:', e)
            wx.showToast({ title: '记录失败', icon: 'none' })
          }
        }
      }
    })
  },

  onEditVisit() {
    const { grave } = this.data
    const now = new Date()
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    this.setData({
      showVisitModal: true,
      editVisitDate: grave.visitDate || defaultDate,
      editVisitTime: grave.visitTime || defaultTime,
      editVisitCount: grave.visitCount || 0
    })
  },

  onCancelEditVisit() {
    this.setData({ showVisitModal: false })
  },

  onDateChange(e) {
    this.setData({ editVisitDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ editVisitTime: e.detail.value })
  },

  onCountChange(e) {
    this.setData({ editVisitCount: parseInt(e.detail.value) || 0 })
  },

  async onSaveVisit() {
    const { grave, editVisitDate, editVisitTime, editVisitCount } = this.data

    try {
      const db = wx.cloud.database()

      await db.collection('graves').doc(grave._id).update({
        data: {
          visitDate: editVisitDate,
          visitTime: editVisitTime,
          visitCount: editVisitCount,
          updateTime: db.serverDate()
        }
      })

      const app = getApp()
      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1

      wx.showToast({ title: '保存成功' })
      this.setData({ showVisitModal: false })
      this.loadGrave(grave._id)
    } catch (e) {
      console.error('onSaveVisit error:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onViewMember() {
    const { member } = this.data
    if (member) {
      wx.navigateTo({
        url: `/pages/memberEdit/memberEdit?id=${member._id}`
      })
    }
  }
})
