const cacheManager = require('../../utils/cacheManager.js')

Page({
  data: {
    members: [],
    loading: false,
    searchKey: '',
    filterGender: '',
    displayMembers: [],
    hasMore: true
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.windowWidth = sysInfo.windowWidth
    this.windowHeight = sysInfo.windowHeight
    this.loadMembers(true)
  },

  onShow() {
    this.loadMembers(true)
  },

  onPullDownRefresh() {
    cacheManager.invalidate(cacheManager.keys.members)
    this.loadMembers(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMembers(false)
    }
  },

  async loadMembers(reset = false) {
    if (this.data.loading) return

    const app = getApp()
    const familyId = app.globalData.familyId

    if (reset) {
      const { data: cached, version: cachedVersion } = cacheManager.get(cacheManager.keys.members, familyId)
      const localVersion = app.globalData.membersVersion

      if (cached && cached.length > 0 && cachedVersion === localVersion) {
        await this.processMembersData(cached)
        return
      }
    }

    this.setData({ loading: true })

    const { members } = this.data

    let allMembers = []
    let skip = reset ? 0 : members.length
    let hasMore = true
    let cloudVersion = 0

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
            cloudVersion = result.result.membersVersion || 0
            allMembers = [...allMembers, ...result.result.data]
            hasMore = result.result.data.length === 20
          } else {
            hasMore = false
          }
        } catch (e) {
          console.error('loadMembers cloud function error:', e)
          hasMore = false
        }
      } else {
        try {
          const db = wx.cloud.database()
          const { data } = await db.collection('members')
            .orderBy('generation', 'asc')
            .skip(skip)
            .limit(20)
            .get()

          allMembers = [...allMembers, ...data]
          hasMore = data.length === 20
        } catch (e) {
          console.error('loadMembers db error:', e)
          hasMore = false
        }
      }

      skip += 20
    }

    app.globalData.membersVersion = cloudVersion

    const memberMap = new Map()
    allMembers.forEach(m => memberMap.set(m._id, m))
    const membersWithSpouseName = allMembers.map(m => {
      let spouseNames = ''
      if (m.spouses && Array.isArray(m.spouses) && m.spouses.length > 0) {
        const names = m.spouses.map(id => memberMap.get(id)?.name || '').filter(n => n)
        spouseNames = names.join('、')
      }
      return { ...m, spouseNames }
    })

    cacheManager.set(cacheManager.keys.members, familyId, membersWithSpouseName, cloudVersion)

    this.setData({
      members: membersWithSpouseName,
      hasMore: false,
      loading: false
    })

    this.getFilteredMembers()
  },

  async processMembersData(membersData) {
    const memberMap = new Map()
    membersData.forEach(member => {
      memberMap.set(member._id, member)
    })

    const membersWithSpouseName = membersData.map(member => {
      let spouseNames = ''
      if (member.spouses && Array.isArray(member.spouses) && member.spouses.length > 0) {
        const names = member.spouses.map(spouseId => {
          const spouseMember = memberMap.get(spouseId)
          return spouseMember ? spouseMember.name : ''
        }).filter(name => name)
        spouseNames = names.join('、')
      }
      return {
        ...member,
        spouseNames
      }
    })

    const membersWithAvatar = await this.convertAvatarsToTempUrls(membersWithSpouseName)

    this.setData({
      members: membersWithAvatar,
      hasMore: false,
      loading: false
    })
    this.getFilteredMembers()
  },

  async convertAvatarsToTempUrls(members) {
    const membersWithAvatar = [...members]
    const membersWithCloudAvatar = membersWithAvatar.filter(m => m.avatar && !m.avatar.startsWith('http'))

    if (membersWithCloudAvatar.length === 0) {
      return membersWithAvatar
    }

    const fileList = membersWithCloudAvatar.map(m => m.avatar).filter(Boolean)

    if (fileList.length === 0) {
      return membersWithAvatar
    }

    try {
      const res = await wx.cloud.getTempFileURL({ fileList })

      if (res.fileList) {
        const urlMap = {}
        res.fileList.forEach((item, index) => {
          if (item.tempFileURL && membersWithCloudAvatar[index]) {
            urlMap[membersWithCloudAvatar[index].avatar] = item.tempFileURL
          }
        })

        membersWithAvatar.forEach((member, index) => {
          if (member.avatar && urlMap[member.avatar]) {
            membersWithAvatar[index].avatar = urlMap[member.avatar]
          }
        })
      }
    } catch (e) {
      console.error('convertAvatarsToTempUrls error:', e)
    }

    return membersWithAvatar
  },

  onSearch(e) {
    const searchKey = e.detail.value.trim()
    this.setData({ searchKey })
    this.getFilteredMembers()
  },

  onFilterGender(e) {
    const filterGender = e.currentTarget.dataset.gender
    this.setData({ filterGender: this.data.filterGender === filterGender ? '' : filterGender })
    this.getFilteredMembers()
  },

  getFilteredMembers() {
    const { members, searchKey, filterGender } = this.data

    let filtered = members

    if (searchKey) {
      const key = searchKey.toLowerCase()
      filtered = filtered.filter(m =>
        (m.name && m.name.toLowerCase().includes(key)) ||
        (m.bio && m.bio.toLowerCase().includes(key)) ||
        (m.rankTitle && m.rankTitle.toLowerCase().includes(key))
      )
    }

    if (filterGender) {
      filtered = filtered.filter(m => m.gender === filterGender)
    }

    this.setData({ displayMembers: filtered })
  },

  onMemberTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/memberEdit/memberEdit?id=${id}`
    })
  },

  onAddMember() {
    wx.navigateTo({
      url: '/pages/memberEdit/memberEdit'
    })
  }
})