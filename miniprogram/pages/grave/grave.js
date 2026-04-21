const CACHE_KEY = 'grave_graves'
const VERSION_KEY = 'grave_version'

const GRAVE_TYPES = [
  { value: 'ancestor', label: '祖先墓', color: '#8B4513' },
  { value: 'clothing', label: '衣冠冢', color: '#A0522D' },
  { value: 'memorial', label: '纪念碑', color: '#D2691E' },
  { value: 'tablet', label: '牌位', color: '#CD853F' },
  { value: 'other', label: '其他', color: '#666666' }
]

Page({
  data: {
    graves: [],
    loading: false,
    searchKey: '',
    filterType: '',
    displayGraves: [],
    hasMore: true,
    membersMap: {},
    memberId: '',
    memberName: ''
  },

  onLoad(options) {
    if (options.memberId) {
      this.setData({ memberId: options.memberId })
      this.loadMemberName(options.memberId)
    }
    this.loadGraves(true)
  },

  onShow() {
    const app = getApp()
    const cachedVersion = wx.getStorageSync(VERSION_KEY)
    const currentVersion = app.globalData.gravesVersion

    if (currentVersion !== cachedVersion) {
      this.loadGraves(true)
    }
  },

  onPullDownRefresh() {
    this.loadGraves(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadGraves(false)
    }
  },

  async loadGraves(reset = false) {
    if (this.data.loading) return

    const { memberId } = this.data
    const cacheKey = CACHE_KEY
    const versionKey = VERSION_KEY
    const app = getApp()

    if (reset) {
      const cached = wx.getStorageSync(cacheKey)
      const cachedVersion = wx.getStorageSync(versionKey)
      const currentVersion = app.globalData.gravesVersion

      if (cached && cached.length > 0 && cachedVersion === currentVersion && currentVersion > 0) {
        this.processGravesData(cached)
        return
      } else if (cached && cached.length > 0 && currentVersion === 0) {
        this.processGravesData(cached)
        return
      }
    }

    this.setData({ loading: true })

    const db = wx.cloud.database()

    let allGraves = []
    let skip = reset ? 0 : this.data.graves.length
    let hasMore = true

    while (hasMore) {
      let query = db.collection('graves')

      if (memberId) {
        query = query.where({ memberId: memberId })
      }

      const { data } = await query
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(20)
        .get()

      if (data.length > 0) {
        allGraves = [...allGraves, ...data]
        skip += 20
      }

      hasMore = data.length === 20
    }

    const finalGraves = reset ? allGraves : [...this.data.graves, ...allGraves]

    this.setData({
      graves: finalGraves,
      hasMore: false,
      loading: false
    })

    wx.setStorageSync(versionKey, app.globalData.gravesVersion)
    wx.setStorageSync(cacheKey, finalGraves)

    await this.enrichWithMemberInfo(finalGraves)
    this.getFilteredGraves()
  },

  async loadMemberName(memberId) {
    if (!memberId) return

    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('members').doc(memberId).get()

      if (data) {
        this.setData({ memberName: data.name })
        wx.setNavigationBarTitle({ title: `${data.name}的墓碑` })
      }
    } catch (e) {
      console.error('loadMemberName error:', e)
    }
  },

  async enrichWithMemberInfo(graves) {
    if (!graves || graves.length === 0) return

    const db = wx.cloud.database()
    const memberIds = graves.map(g => g.memberId).filter(id => id)

    if (memberIds.length === 0) return

    try {
      const { data: members } = await db.collection('members')
        .where({
          _id: db.command.in(memberIds)
        })
        .get()

      const membersMap = {}
      members.forEach(m => {
        membersMap[m._id] = m
      })

      this.setData({ membersMap })

      const enrichedGraves = graves.map(grave => {
        const member = membersMap[grave.memberId]
        const typeInfo = GRAVE_TYPES.find(t => t.value === grave.graveType) || GRAVE_TYPES[4]
        const memberName = member ? member.name : '未知成员'

        return {
          ...grave,
          memberName: memberName,
          memberLastChar: memberName.slice(-1),
          typeLabel: typeInfo.label,
          typeColor: typeInfo.color
        }
      })

      this.setData({ graves: enrichedGraves })
      wx.setStorageSync(CACHE_KEY, enrichedGraves)
      this.getFilteredGraves()
    } catch (e) {
      console.error('enrichWithMemberInfo error:', e)
    }
  },

  processGravesData(gravesData) {
    const enrichedGraves = gravesData.map(grave => {
      const typeInfo = GRAVE_TYPES.find(t => t.value === grave.graveType) || GRAVE_TYPES[4]
      const memberName = grave.memberName || '未知成员'

      return {
        ...grave,
        memberLastChar: memberName.slice(-1),
        typeLabel: typeInfo.label,
        typeColor: typeInfo.color
      }
    })

    this.setData({
      graves: enrichedGraves,
      hasMore: false,
      loading: false
    })

    this.enrichWithMemberInfo(enrichedGraves)
    this.getFilteredGraves()
  },

  onSearch(e) {
    this.setData({ searchKey: e.detail.value })
    this.getFilteredGraves()
  },

  onFilterType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
    this.getFilteredGraves()
  },

  getFilteredGraves() {
    let { graves, searchKey, filterType, memberId } = this.data
    const key = (searchKey || '').trim().toLowerCase()

    const filtered = graves.filter(g => {
      const matchSearch = !key || (g.memberName && g.memberName.toLowerCase().includes(key))
      const matchType = !filterType || g.graveType === filterType
      const matchMember = !memberId || g.memberId === memberId
      return matchSearch && matchType && matchMember
    })

    this.setData({ displayGraves: filtered })
  },

  onGraveTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/graveDetail/graveDetail?id=${id}`
    })
  },

  onAddGrave() {
    wx.navigateTo({
      url: '/pages/graveEdit/graveEdit'
    })
  }
})
