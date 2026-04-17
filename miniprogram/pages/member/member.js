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
    const app = getApp()
    const versionKey = 'member_version'
    const cachedVersion = wx.getStorageSync(versionKey)
    const currentVersion = app.globalData.membersVersion
    
    if (currentVersion !== cachedVersion) {
      this.loadMembers(true)
    }
  },

  onPullDownRefresh() {
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
    
    const cacheKey = 'member_members'
    const versionKey = 'member_version'
    const app = getApp()
    
    if (reset) {
      const cached = wx.getStorageSync(cacheKey)
      const cachedVersion = wx.getStorageSync(versionKey)
      const currentVersion = app.globalData.membersVersion
      
      if (cached && cached.length > 0 && cachedVersion === currentVersion && currentVersion > 0) {
        this.processMembersData(cached)
        return
      } else if (cached && cached.length > 0 && currentVersion === 0) {
        this.processMembersData(cached)
        return
      }
    }
    
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    const { members } = this.data
    
    let allMembers = []
    let skip = reset ? 0 : members.length
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
    
    const finalMembers = reset ? allMembers : [...members, ...allMembers]
    
    const memberMap = new Map()
    finalMembers.forEach(member => {
      memberMap.set(member._id, member)
    })

    const membersWithSpouseName = finalMembers.map(member => {
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
    
    this.setData({
      members: membersWithSpouseName,
      hasMore: false,
      loading: false
    })
    
    wx.setStorageSync(versionKey, app.globalData.membersVersion)
    wx.setStorageSync(cacheKey, membersWithSpouseName)
    
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
        
        membersWithAvatar.forEach(member => {
          if (member.avatar && urlMap[member.avatar]) {
            member.avatar = urlMap[member.avatar]
          }
        })
      }
    } catch (e) {
      console.error('convertAvatarsToTempUrls error:', e)
    }
    
    return membersWithAvatar
  },

  onSearch(e) {
    this.setData({ searchKey: e.detail.value })
    this.getFilteredMembers()
  },

  onFilterGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({ filterGender: gender })
    this.getFilteredMembers()
  },

  getFilteredMembers() {
    let { members, searchKey, filterGender } = this.data
    const filtered = members.filter(m => {
      const matchSearch = !searchKey || m.name.includes(searchKey)
      const matchGender = !filterGender || m.gender === filterGender
      return matchSearch && matchGender
    })
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
  },

  onDeleteMember(e) {
    const { id } = e.currentTarget.dataset
    const that = this
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该成员吗？此操作不可恢复',
      success(res) {
        if (res.confirm) {
          that.deleteMember(id)
        }
      }
    })
  },

  async deleteMember(id) {
    try {
      const db = wx.cloud.database()
      await db.collection('members').doc(id).remove()
      
      const app = getApp()
      app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
      
      wx.showToast({ title: '删除成功' })
      this.loadMembers(true)
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})
