Page({
  data: {
    members: [],
    rootId: '',
    initialRootId: '',
    loading: false,
    searchKey: '',
    filterGender: '',
    displayMembers: [],
    scrollX: 0,
    scrollY: 0,
    treeViewWidth: 5000,
    treeViewHeight: 5000,
    scale: 1,
    scaleOriginX: 0,
    scaleOriginY: 0,
    branchOptions: [],
    selectedBranchIndex: -1,
    selectedBranchId: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.windowWidth = sysInfo.windowWidth
    this.windowHeight = sysInfo.windowHeight
    this.windowCenterX = sysInfo.windowWidth / 2
    this.windowCenterY = sysInfo.windowHeight / 2
    this.loadMembers(true)
  },

  onShow() {
    const app = getApp()
    const versionKey = 'familyTree_version'
    const cachedVersion = wx.getStorageSync(versionKey)
    const currentVersion = app.globalData.membersVersion
    
    if (currentVersion !== cachedVersion) {
      this.loadMembers(true)
    }
  },

  async loadMembers(reset = false) {
    if (this.data.loading) return
    
    const cacheKey = 'familyTree_members'
    const versionKey = 'familyTree_version'
    const app = getApp()
    
    if (reset) {
      const cached = wx.getStorageSync(cacheKey)
      const cachedVersion = wx.getStorageSync(versionKey)
      const currentVersion = app.globalData.membersVersion
      
      if (cached && cached.length > 0 && cachedVersion === currentVersion && currentVersion > 0) {
        this.processMembersData(cached, false)
        return
      } else if (cached && cached.length > 0 && currentVersion === 0) {
        this.processMembersData(cached, true)
        return
      }
    }
    
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    
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
    
    wx.setStorageSync(cacheKey, allMembers)
    wx.setStorageSync(versionKey, app.globalData.membersVersion)
    
    this.processMembersData(allMembers, true)
  },

  processMembersData(members, updatePosition = false) {
    const rootCandidates = members.filter(m => !m.fatherId)
      .sort((a, b) => {
        const hasRelationsA = (a.spouses && a.spouses.length > 0) || members.some(m => m.fatherId === a._id || m.motherId === a._id)
        const hasRelationsB = (b.spouses && b.spouses.length > 0) || members.some(m => m.fatherId === b._id || m.motherId === b._id)
        if (hasRelationsA && !hasRelationsB) return -1
        if (!hasRelationsA && hasRelationsB) return 1
        return (a.generation || 1) - (b.generation || 1)
      })
    
    const branches = this.calculateBranches(members)
    
    let rootId = this.data.rootId
    if (!rootId || updatePosition) {
      if (rootCandidates.length > 0) {
        rootId = rootCandidates[0]._id
        this.initialRootId = rootId
      } else if (members.length > 0) {
        rootId = members[0]._id
        this.initialRootId = rootId
      }
    }

    const setDataObj = {
      members: members,
      rootId,
      initialRootId: this.initialRootId,
      loading: false,
      branchOptions: branches
    }
    
    if (updatePosition) {
      setDataObj.scale = 1
      setDataObj.scrollX = 0
      setDataObj.scrollY = 0
    }
    
    this.setData(setDataObj)
    this.getFilteredMembers()
    setTimeout(() => {
      this.measureTreeSize()
      if (rootId && updatePosition) {
        this.scrollToNode(rootId)
      }
    }, 300)
  },

  // 测量族谱树实际渲染尺寸，动态撑开 movable-view
  measureTreeSize() {
    const query = wx.createSelectorQuery()
    query.select('.movable-view .tree-root').boundingClientRect()
    query.exec((res) => {
      if (!res[0]) return
      const { width, height } = res[0]
      const padding = 200 // 四周留白，单位 px
      const newWidth = Math.max(width + padding * 2, this.windowWidth * 3)
      const newHeight = Math.max(height + padding * 2, this.windowHeight * 3)
      this.setData({
        treeViewWidth: newWidth,
        treeViewHeight: newHeight
      })
    })
  },

  calculateBranches(members) {
    const memberMap = {}
    members.forEach(m => {
      memberMap[m._id] = m
    })
    
    const rootMembers = members.filter(m => !m.fatherId && m.gender === '男')
    
    const branches = []
    rootMembers.forEach(root => {
      const branchName = root.name || '始祖'
      branches.push({
        id: root._id,
        name: branchName + '支'
      })
    })
    
    if (branches.length === 0) {
      branches.push({
        id: '',
        name: '始祖支脉'
      })
    }
    
    return branches
  },

  onBranchChange(e) {
    const index = e.detail.value
    const branch = this.data.branchOptions[index]
    
    if (branch) {
      this.setData({
        selectedBranchIndex: index,
        selectedBranchId: branch.id,
        rootId: branch.id,
        searchKey: '',
        scale: 1,
        scrollX: 0,
        scrollY: 0
      })
      
      setTimeout(() => {
        this.measureTreeSize()
        setTimeout(() => {
          this.scrollToNode(branch.id)
        }, 200)
      }, 450)
    }
  },

  onResetRoot() {
    if (this.initialRootId) {
      this.setData({
        rootId: this.initialRootId,
        searchKey: '',
        scrollX: 0,
        scrollY: 0,
        scale: 1
      })
      setTimeout(() => {
        this.scrollToNode(this.initialRootId)
      }, 500)
    }
  },

  onScroll(e) {
    this.data.scrollX = e.detail.scrollLeft
    this.data.scrollY = e.detail.scrollTop
  },

  getViewCenter() {
    return {
      x: this.data.scrollX + this.windowWidth / 2,
      y: this.data.scrollY + this.windowHeight / 2
    }
  },

  onZoomIn() {
    const newScale = Math.min(3, this.data.scale + 0.2)
    const center = this.getViewCenter()
    this.setData({
      scale: newScale,
      scaleOriginX: center.x,
      scaleOriginY: center.y
    })
  },

  onZoomOut() {
    const newScale = Math.max(0.3, this.data.scale - 0.2)
    const center = this.getViewCenter()
    this.setData({
      scale: newScale,
      scaleOriginX: center.x,
      scaleOriginY: center.y
    })
  },

  onResetZoom() {
    const center = this.getViewCenter()
    this.setData({
      scale: 1,
      scaleOriginX: center.x,
      scaleOriginY: center.y
    })
  },

  onNodeTap(e) {
    const { id, generation } = e.detail
    wx.navigateTo({
      url: `/pages/memberEdit/memberEdit?id=${id}&generation=${generation}`
    })
  },

  onAddMember() {
    wx.navigateTo({
      url: '/pages/memberEdit/memberEdit'
    })
  },

  onSearch(e) {
    this.setData({ searchKey: e.detail.value })
    this.getFilteredMembers()
  },

  async onSearchResultTap(e) {
    const { id } = e.currentTarget.dataset
    
    const ultimateRootId = this.findUltimateRootId(id)
    
    this.setData({
      searchKey: '',
      rootId: ultimateRootId,
      scale: 1
    })
    
    // 增加延迟，确保 rootId 切换后的族谱树完全渲染，然后重新测量尺寸
    setTimeout(() => {
      this.measureTreeSize()
      setTimeout(() => {
        this.scrollToNode(id)
      }, 200)
    }, 450)
  },

  // 向上追溯寻找顶级祖先
  findUltimateRootId(memberId) {
    const { members } = this.data
    const memberMap = {}
    members.forEach(m => {
      memberMap[m._id] = m
    })
    
    let current = memberMap[memberId]
    if (!current) return memberId
    
    const visited = new Set()
    while (current && (current.fatherId || current.motherId)) {
      if (visited.has(current._id)) break
      visited.add(current._id)
      
      const parentId = current.fatherId || current.motherId
      if (memberMap[parentId]) {
        current = memberMap[parentId]
      } else {
        break
      }
    }
    return current ? current._id : memberId
  },

  scrollToNode(nodeId, isSilent = false) {
    const query = wx.createSelectorQuery()
    
    query.select(`.tree-inner >>> #node-${nodeId}`).boundingClientRect()
    query.select('.tree-inner').boundingClientRect()
    query.select('.tree-scroll').boundingClientRect()
    
    query.exec((res) => {
      if (!res[0]) {
        if (!isSilent) {
          console.error('定位失败：未找到目标节点', nodeId)
        }
        return
      }
      
      if (!res[1] || !res[2]) return
      
      const nodeRect = res[0]
      const innerRect = res[1]
      const scrollRect = res[2]
      
      const nodeLeft = nodeRect.left - innerRect.left
      const nodeTop = nodeRect.top - innerRect.top
      
      const targetX = nodeLeft - (scrollRect.width / 2) + (nodeRect.width / 2)
      const targetY = nodeTop - (scrollRect.height / 2) + (nodeRect.height / 2)
      
      this.setData({
        scrollX: Math.max(0, targetX),
        scrollY: Math.max(0, targetY)
      })
    })
  },

  onFilterGender(e) {
    this.setData({ filterGender: e.currentTarget.dataset.gender })
    this.getFilteredMembers()
  },

  getFilteredMembers() {
    let { members, searchKey, filterGender } = this.data
    const key = (searchKey || '').trim().toLowerCase()
    const filtered = members.filter(m => {
      const name = (m.name || '').trim().toLowerCase()
      const matchSearch = !key || name.includes(key)
      const matchGender = !filterGender || m.gender === filterGender
      return matchSearch && matchGender
    })
    this.setData({ displayMembers: filtered })
  }
})
