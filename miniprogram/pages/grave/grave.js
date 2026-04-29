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
    const { version } = cacheManager.get(cacheManager.keys.graves, app.globalData.familyId)
    const currentVersion = app.globalData.gravesVersion

    if (currentVersion !== version) {
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

    const app = getApp()
    const familyId = app.globalData.familyId
    const { memberId } = this.data

    if (reset) {
      const { data: cached, version } = cacheManager.get(cacheManager.keys.graves, familyId)
      const currentVersion = app.globalData.gravesVersion

      if (cached && cached.length > 0 && version === currentVersion) {
        this.processGravesData(cached)
        return
      }
    }

    this.setData({ loading: true })

    let allGraves = []
    let skip = reset ? 0 : this.data.graves.length
    let hasMore = true

    while (hasMore) {
      if (familyId) {
        try {
          const result = await wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'familyDataQuery',
              collection: 'graves',
              familyId: familyId,
              orderBy: { field: 'createTime', order: 'desc' },
              skip: skip,
              limit: 20
            }
          })

          if (result.result && result.result.success && result.result.data) {
            let filteredData = result.result.data
            if (memberId) {
              filteredData = result.result.data.filter(g => g.memberId === memberId)
            }
            allGraves = [...allGraves, ...filteredData]
            hasMore = result.result.data.length === 20
          } else {
            hasMore = false
          }
        } catch (e) {
          console.error('loadGraves cloud function error:', e)
          hasMore = false
        }
      } else {
        const db = wx.cloud.database()
        let query = db.collection('graves')

        if (memberId) {
          query = query.where({ memberId: memberId })
        }

        try {
          const { data } = await query
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(20)
            .get()

          allGraves = [...allGraves, ...data]
          hasMore = data.length === 20
        } catch (e) {
          console.error('loadGraves db error:', e)
          hasMore = false
        }
      }

      skip += 20
    }

    const finalGraves = reset ? allGraves : [...this.data.graves, ...allGraves]

    this.setData({
      graves: finalGraves,
      hasMore: false,
      loading: false
    })

    cacheManager.set(cacheManager.keys.graves, familyId, finalGraves, app.globalData.gravesVersion)

    await this.enrichWithMemberInfo(finalGraves)
    this.getFilteredGraves()
  },

  async loadMemberName(memberId) {
    if (!memberId) return

    const app = getApp()
    const db = wx.cloud.database()

    try {
      let member = null

      if (app.globalData.familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'members',
            familyId: app.globalData.familyId,
            limit: 100
          }
        })

        if (result.result && result.result.success && result.result.data) {
          member = result.result.data.find(m => m._id === memberId)
        }
      } else {
        const res = await db.collection('members').doc(memberId).get()
        member = res.data
      }

      if (member) {
        this.setData({ memberName: member.name })
        wx.setNavigationBarTitle({ title: `${member.name}的墓碑` })
      }
    } catch (e) {
      console.error('loadMemberName error:', e)
    }
  },

  async enrichWithMemberInfo(graves) {
    if (!graves || graves.length === 0) return

    const app = getApp()
    const db = wx.cloud.database()
    const memberIds = graves.map(g => g.memberId).filter(id => id)

    if (memberIds.length === 0) return

    try {
      let members = []

      if (app.globalData.familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'members',
            familyId: app.globalData.familyId,
            limit: 100
          }
        })

        if (result.result && result.result.success && result.result.data) {
          members = result.result.data
        }
      } else {
        const res = await db.collection('members')
          .where({
            _id: db.command.in(memberIds)
          })
          .get()
        members = res.data
      }

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
      this.getFilteredGraves()
    } catch (e) {
      console.error('enrichWithMemberInfo error:', e)
      const enrichedGraves = graves.map(grave => {
        const typeInfo = GRAVE_TYPES.find(t => t.value === grave.graveType) || GRAVE_TYPES[4]
        return {
          ...grave,
          memberName: '未知成员',
          memberLastChar: '成员',
          typeLabel: typeInfo.label,
          typeColor: typeInfo.color
        }
      })
      this.setData({ graves: enrichedGraves, loading: false })
      this.getFilteredGraves()
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