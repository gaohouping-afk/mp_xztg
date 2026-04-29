const cacheManager = require('../../utils/cacheManager.js')

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
    this.loadMembers(true)
  },

  onPullDownRefresh() {
    cacheManager.invalidate(cacheManager.keys.members)
    this.loadMembers(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadMembers(reset = false) {
    if (this.data.loading) return

    const app = getApp()
    const familyId = app.globalData.familyId

    if (reset) {
      const { data: cached, version: cachedVersion } = cacheManager.get(cacheManager.keys.members, familyId)
      const localVersion = app.globalData.membersVersion

      if (cached && cached.length > 0 && cachedVersion === localVersion) {
        this.processMembersData(cached, false)
        return
      }
    }

    this.setData({ loading: true })

    let allMembers = []
    let skip = 0
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

          console.log('loadMembers page:', { skip, count: result.result?.data?.length || 0, total: result.result?.total })
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
    cacheManager.set(cacheManager.keys.members, familyId, allMembers, cloudVersion)

    this.processMembersData(allMembers, true)
  },

  processMembersData(members, updatePosition = false) {
    console.log('processMembersData: total members =', members.length)
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
      } else {
        this.initialRootId = ''
      }
    }

    const setDataObj = {
      members: members,
      rootId: rootId || '',
      initialRootId: this.initialRootId || '',
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

  measureTreeSize() {
    const query = wx.createSelectorQuery()
    query.select('.movable-view .tree-root').boundingClientRect()
    query.exec((res) => {
      if (!res[0]) return
      const { width, height } = res[0]
      const padding = 200
      const newWidth = Math.max(width + padding * 2, this.windowWidth * 3)
      const newHeight = Math.max(height + padding * 2, this.windowHeight * 3)
      this.setData({
        treeViewWidth: newWidth,
        treeViewHeight: newHeight
      })
    })
  },

  calculateBranches(members) {
    const branches = []
    const generationMap = {}

    members.forEach(m => {
      const gen = m.generation || 1
      if (!generationMap[gen]) {
        generationMap[gen] = []
      }
      generationMap[gen].push(m)
    })

    Object.keys(generationMap).sort((a, b) => a - b).forEach(gen => {
      const genMembers = generationMap[gen]
      genMembers.forEach(m => {
        if (gen === '1' && m.gender === '男') {
          branches.push({
            id: m._id,
            name: m.name,
            generation: m.generation
          })
        }
      })
    })

    console.log('calculateBranches: branches count =', branches.length, branches)
    return branches
  },

  onSwitchBranch(e) {
    const index = e.currentTarget.dataset.index
    const branch = this.data.branchOptions[index]
    if (branch) {
      this.setData({
        selectedBranchIndex: index,
        selectedBranchId: branch.id
      })
      this.scrollToNode(branch.id)
    }
  },

  scrollToNode(nodeId) {
    const query = wx.createSelectorQuery()
    query.select(`.tree-inner >>> #node-${nodeId}`).boundingClientRect()
    query.select('.tree-inner').boundingClientRect()
    query.select('.tree-scroll').boundingClientRect()
    query.exec((res) => {
      if (!res[0] || !res[1] || !res[2]) {
        console.error('scrollToNode: 未找到节点', nodeId, res)
        return
      }
      const nodeRect = res[0]
      const innerRect = res[1]
      const viewRect = res[2]
      const nodeLeft = nodeRect.left - innerRect.left
      const nodeTop = nodeRect.top - innerRect.top
      const targetX = nodeLeft - viewRect.width / 2 + nodeRect.width / 2
      const targetY = nodeTop - viewRect.height / 2 + nodeRect.height / 2
      this.setData({
        scrollX: targetX,
        scrollY: targetY
      })
    })
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

  onSearchResultTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      this.scrollToNode(id)
      this.setData({ searchKey: '' })
    }
  },

  onBranchChange(e) {
    const index = e.detail.value
    const branch = this.data.branchOptions[index]
    if (branch) {
      this.setData({
        selectedBranchIndex: index,
        selectedBranchId: branch.id,
        rootId: branch.id
      })
      setTimeout(() => {
        this.scrollToNode(branch.id)
      }, 100)
    }
  },

  onNodeTap(e) {
    const { id } = e.detail
    if (id) {
      wx.navigateTo({
        url: `/pages/memberEdit/memberEdit?id=${id}`
      })
    }
  },

  onResetRoot() {
    const { initialRootId } = this.data
    if (initialRootId) {
      this.setData({
        rootId: initialRootId,
        searchKey: '',
        scale: 1
      })
      this.getFilteredMembers()
      setTimeout(() => {
        this.scrollToNode(initialRootId)
      }, 100)
    } else {
      wx.showToast({ title: '无根节点可恢复', icon: 'none' })
    }
  },

  onAddMember() {
    wx.navigateTo({
      url: '/pages/memberEdit/memberEdit'
    })
  },

  onZoomIn() {
    let scale = this.data.scale + 0.1
    if (scale > 2) scale = 2
    this.setData({ scale })
  },

  onZoomOut() {
    let scale = this.data.scale - 0.1
    if (scale < 0.3) scale = 0.3
    this.setData({ scale })
  },

  onScroll(e) {
  },

  onMemberTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/memberEdit/memberEdit?id=${id}`
    })
  },

  onTreeBindchange(e) {
    const { x, y } = e.detail
    this.setData({
      scrollX: x,
      scrollY: y
    })
  },

  onTreeScaleChange(e) {
    let scale = e.detail.scale
    if (scale < 0.3) scale = 0.3
    if (scale > 2) scale = 2
    this.setData({ scale })
  },

  onResetView() {
    this.setData({
      scale: 1,
      scrollX: 0,
      scrollY: 0
    })
    if (this.data.rootId) {
      this.scrollToNode(this.data.rootId)
    }
  },

  getMemberPosition(memberId) {
    const query = wx.createSelectorQuery()
    return new Promise((resolve) => {
      query.select(`#member-${memberId}`).boundingClientRect()
      query.exec((res) => {
        if (res[0]) {
          resolve({
            x: res[0].left + res[0].width / 2,
            y: res[0].top + res[0].height / 2
          })
        } else {
          resolve(null)
        }
      })
    })
  },

  calculatePositions(members, rootId) {
    if (!members || members.length === 0) return {}

    const positions = {}
    const padding = 60
    const horizontalSpacing = 160
    const verticalSpacing = 180

    const generationMap = {}
    members.forEach(m => {
      const gen = m.generation || 1
      if (!generationMap[gen]) {
        generationMap[gen] = []
      }
      generationMap[gen].push(m)
    })

    const generations = Object.keys(generationMap).sort((a, b) => a - b)

    generations.forEach((gen, genIndex) => {
      const genMembers = generationMap[gen]
      genMembers.forEach((member, index) => {
        const x = 2500 + (index - genMembers.length / 2) * horizontalSpacing + genIndex * 50
        const y = 2500 + genIndex * verticalSpacing
        positions[member._id] = { x, y }
      })
    })

    return positions
  },

  generateTreeData() {
    const { members, rootId, scale, scrollX, scrollY } = this.data
    if (!members || members.length === 0) {
      return { nodes: [], links: [] }
    }

    const positions = this.calculatePositions(members, rootId)
    const nodeMap = new Map()
    const nodes = []
    const links = []

    members.forEach(member => {
      const pos = positions[member._id] || { x: 2500, y: 2500 }
      const node = {
        id: member._id,
        name: member.name,
        avatar: member.avatar || '',
        gender: member.gender || 'male',
        generation: member.generation || 1,
        x: pos.x,
        y: pos.y,
        fatherId: member.fatherId,
        motherId: member.motherId,
        spouses: member.spouses || []
      }
      nodes.push(node)
      nodeMap.set(member._id, node)
    })

    nodes.forEach(node => {
      if (node.fatherId && nodeMap.has(node.fatherId)) {
        links.push({
          source: node.fatherId,
          target: node.id,
          type: 'father-child'
        })
      }
      if (node.motherId && nodeMap.has(node.motherId)) {
        links.push({
          source: node.motherId,
          target: node.id,
          type: 'mother-child'
        })
      }
      node.spouses.forEach(spouseId => {
        if (nodeMap.has(spouseId)) {
          links.push({
            source: node.id,
            target: spouseId,
            type: 'spouse'
          })
        }
      })
    })

    return { nodes, links }
  },

  renderTree() {
    const { nodes, links } = this.generateTreeData()
    this.setData({
      treeNodes: nodes,
      treeLinks: links
    })
  }
})