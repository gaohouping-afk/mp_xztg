const CACHE_KEY = 'member_members'
const VERSION_KEY = 'member_version'

Page({
  data: {
    id: '',
    name: '',
    gender: '男',
    generation: 1,
    birthYear: '',
    deathYear: '',
    spouses: [],
    spouseNames: '',
    originalSpouses: [],
    showSpouseModal: false,
    selectedSpouses: [],
    fatherId: '',
    motherId: '',
    rankTitle: '',
    fatherIndex: -1,
    motherIndex: -1,
    bio: '',
    avatar: '',
    members: [],
    fatherOptions: [],
    motherOptions: [],
    isEdit: false,
    loading: false,
    avatarCloudPath: '',
    avatarToDelete: ''
  },

  onLoad(options) {
    const membersCache = wx.getStorageSync(CACHE_KEY) || []
    const cachedVersion = wx.getStorageSync(VERSION_KEY) || 0
    const app = getApp()
    const currentVersion = app.globalData.membersVersion || 0
    
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      
      const cachedMember = membersCache.find(m => m._id === options.id)
      if (cachedMember && cachedVersion === currentVersion) {
        this.loadFromCache(cachedMember, options.generation)
      } else {
        this.loadMember(options.id, options.generation)
      }
    } else {
      const generation = parseInt(options.generation) || 1
      this.setData({ generation })
      if (membersCache.length > 0 && cachedVersion === currentVersion) {
        this.loadAllMembersFromCache()
      } else {
        this.loadAllMembers()
      }
    }
  },

  async convertAvatarToTempUrl(avatarPath) {
    if (!avatarPath || avatarPath.startsWith('http')) {
      return avatarPath
    }
    
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [avatarPath]
      })
      
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        return res.fileList[0].tempFileURL
      }
    } catch (e) {
      console.error('convertAvatarToTempUrl error:', e)
    }
    
    return avatarPath
  },

  async loadFromCache(data, generationFromTree) {
    const membersCache = wx.getStorageSync(CACHE_KEY) || []
    
    const getMemberName = (memberId) => {
      if (!memberId) return ''
      const member = membersCache.find(m => m._id === memberId)
      return member ? member.name : ''
    }
    
    const spouseNames = []
    if (data.spouses && Array.isArray(data.spouses)) {
      for (const spouseId of data.spouses) {
        if (typeof spouseId === 'string' && spouseId.length > 0) {
          const name = getMemberName(spouseId)
          if (name) spouseNames.push(name)
        }
      }
    }
    
    const fatherName = getMemberName(data.fatherId)
    const motherName = getMemberName(data.motherId)
    
    const avatarTempUrl = await this.convertAvatarToTempUrl(data.avatar)
    
    const updateData = {
      name: data.name || '',
      gender: data.gender || '男',
      generation: generationFromTree ? parseInt(generationFromTree) : (data.generation || 1),
      birthYear: data.birthYear || '',
      deathYear: data.deathYear || '',
      spouses: data.spouses || [],
      originalSpouses: data.spouses || [],
      spouseNames: spouseNames.join('、'),
      fatherId: data.fatherId || '',
      motherId: data.motherId || '',
      fatherName: fatherName,
      motherName: motherName,
      rankTitle: data.rankTitle || '',
      bio: data.bio || '',
      avatar: avatarTempUrl,
      avatarCloudPath: data.avatar || ''
    }
    this.setData(updateData)
    this.loadAllMembersFromCache(data._id, updateData.gender)
  },

  loadAllMembersFromCache(currentId, currentGender) {
    const membersCache = wx.getStorageSync(CACHE_KEY) || []
    const data = membersCache
    
    const id = currentId || this.data.id
    const gender = currentGender || this.data.gender
    const { fatherId, motherId } = this.data
    
    const fatherOptions = data.filter(m => {
      if (id && m._id === id) return false
      return (m.gender || '').trim() === '男'
    })
    
    const motherOptions = data.filter(m => {
      if (id && m._id === id) return false
      return (m.gender || '').trim() === '女'
    })
    
    const spouseOptions = data.filter(m => {
      if (id && m._id === id) return false
      const mGender = (m.gender || '').trim()
      const targetGender = (gender || '').trim()
      if (mGender === targetGender) return false
      const hasSpouses = m.spouses && Array.isArray(m.spouses) && m.spouses.length > 0
      const isCurrentSpouse = id && m.spouses && Array.isArray(m.spouses) && m.spouses.includes(id)
      const allowMarriedMaleForFemale = targetGender === '女' && mGender === '男'
      return !hasSpouses || isCurrentSpouse || allowMarriedMaleForFemale
    })
    
    const fatherIndex = fatherId ? fatherOptions.findIndex(m => m._id === fatherId) : -1
    const motherIndex = motherId ? motherOptions.findIndex(m => m._id === motherId) : -1
    
    this.setData({ 
      members: data,
      fatherOptions,
      motherOptions,
      spouseOptions: spouseOptions,
      fatherIndex,
      motherIndex
    })
  },

  async loadMember(id, generationFromTree) {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('members').doc(id).get()
      
      if (data) {
        const membersCache = wx.getStorageSync(CACHE_KEY) || []
        
        const getMemberName = (memberId) => {
          if (!memberId) return ''
          const member = membersCache.find(m => m._id === memberId)
          return member ? member.name : ''
        }
        
        const spouseNames = []
        if (data.spouses && Array.isArray(data.spouses)) {
          for (const spouseId of data.spouses) {
            if (typeof spouseId === 'string' && spouseId.length > 0) {
              const name = getMemberName(spouseId)
              if (name) spouseNames.push(name)
            }
          }
        }
        
        const fatherName = getMemberName(data.fatherId)
        const motherName = getMemberName(data.motherId)
        
        const avatarTempUrl = await this.convertAvatarToTempUrl(data.avatar)
        
        const updateData = {
          name: data.name || '',
          gender: data.gender || '男',
          generation: generationFromTree ? parseInt(generationFromTree) : (data.generation || 1),
          birthYear: data.birthYear || '',
          deathYear: data.deathYear || '',
          spouses: data.spouses || [],
          originalSpouses: data.spouses || [],
          spouseNames: spouseNames.join('、'),
          fatherId: data.fatherId || '',
          motherId: data.motherId || '',
          fatherName: fatherName,
          motherName: motherName,
          rankTitle: data.rankTitle || '',
          bio: data.bio || '',
          avatar: avatarTempUrl,
          avatarCloudPath: data.avatar || ''
        }
        this.setData(updateData)
        await this.loadAllMembers(id, updateData.gender)
      } else {
        await this.loadAllMembers()
      }
    } catch (e) {
      console.error('Load member error:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async loadAllMembers(currentId, currentGender) {
    const db = wx.cloud.database()
    
    let allMembers = []
    let skip = 0
    let hasMore = true
    
    while (hasMore) {
      const { data } = await db.collection('members')
        .orderBy('updateTime', 'desc')
        .skip(skip)
        .limit(20)
        .get()
      
      if (data.length > 0) {
        allMembers = [...allMembers, ...data]
        skip += 20
      }
      
      hasMore = data.length === 20
    }
    
    const data = allMembers
    
    const id = currentId || this.data.id
    const gender = currentGender || this.data.gender
    const { fatherId, motherId } = this.data
    
    const fatherOptions = data.filter(m => {
      if (id && m._id === id) return false
      return (m.gender || '').trim() === '男'
    })
    
    const motherOptions = data.filter(m => {
      if (id && m._id === id) return false
      return (m.gender || '').trim() === '女'
    })
    
    const spouseOptions = data.filter(m => {
      // 1. 不能是自己
      if (id && m._id === id) return false
      
      // 2. 性别必须不一致 (鲁棒性处理：去除空格，默认男)
      const mGender = (m.gender || '').trim()
      const targetGender = (gender || '').trim()
      if (mGender === targetGender) return false
      
      // 3. 状态过滤
      // - 默认：未婚 或 已经是当前成员的配偶
      // - 特殊：当前编辑对象为女性时，允许显示已婚男性
      const hasSpouses = m.spouses && Array.isArray(m.spouses) && m.spouses.length > 0
      const isCurrentSpouse = id && m.spouses && Array.isArray(m.spouses) && m.spouses.includes(id)
      const allowMarriedMaleForFemale = targetGender === '女' && mGender === '男'
      
      return !hasSpouses || isCurrentSpouse || allowMarriedMaleForFemale
    })
    
    const fatherIndex = fatherId ? fatherOptions.findIndex(m => m._id === fatherId) : -1
    const motherIndex = motherId ? motherOptions.findIndex(m => m._id === motherId) : -1
    
    this.setData({ 
      members: data,
      fatherOptions,
      motherOptions,
      spouseOptions: spouseOptions,
      fatherIndex,
      motherIndex
    })
  },

  toggleSpouse(e) {
    const spouseId = e.currentTarget.dataset.id
    if (!spouseId) return
    
    let selectedSpouses = this.data.selectedSpouses || []
    if (selectedSpouses.indexOf(spouseId) > -1) {
      selectedSpouses = selectedSpouses.filter(id => id !== spouseId)
    } else {
      selectedSpouses = [...selectedSpouses, spouseId]
    }
    this.setData({ selectedSpouses })
  },

  showSpousePicker() {
    this.setData({
      showSpouseModal: true,
      selectedSpouses: [...this.data.spouses]
    })
  },

  hideSpousePicker() {
    this.setData({ showSpouseModal: false })
  },

  confirmSpouse() {
    const newSpouses = this.data.selectedSpouses || []
    const newSpouseNames = newSpouses.map(id => {
      const spouse = this.data.members.find(m => m._id === id)
      return spouse ? spouse.name : ''
    }).filter(name => name).join('、')
    
    this.setData({ 
      spouses: newSpouses,
      spouseNames: newSpouseNames,
      showSpouseModal: false
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onRankTitleInput(e) {
    this.setData({ rankTitle: e.detail.value })
  },

  onGenderChange(e) {
    const gender = e.detail.value
    this.setData({ gender })
    // 性别改变时，重新加载配偶选项
    this.loadAllMembers()
  },

  onBirthYearInput(e) {
    this.setData({ birthYear: e.detail.value })
  },

  onDeathYearInput(e) {
    this.setData({ deathYear: e.detail.value })
  },

  onFatherChange(e) {
    const index = parseInt(e.detail.value)
    const { fatherOptions } = this.data
    const fatherId = index >= 0 && fatherOptions[index] ? fatherOptions[index]._id : ''
    this.setData({ 
      fatherId: fatherId,
      fatherIndex: index
    })
  },

  onMotherChange(e) {
    const index = parseInt(e.detail.value)
    const { motherOptions } = this.data
    const motherId = index >= 0 && motherOptions[index] ? motherOptions[index]._id : ''
    this.setData({ 
      motherId: motherId,
      motherIndex: index
    })
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value })
  },

  async onChooseAvatar() {
    const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] })
    if (res.tempFilePaths.length > 0) {
      wx.showLoading({ title: '上传中...' })
      
      const cloudPath = `avatars/${Date.now()}-${Math.random()}.${res.tempFilePaths[0].split('.').pop()}`
      
      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: res.tempFilePaths[0]
        })
        
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        })
        
        if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
          this.setData({ 
            avatar: tempRes.fileList[0].tempFileURL,
            avatarCloudPath: uploadRes.fileID
          })
        } else {
          this.setData({ avatar: uploadRes.fileID })
        }
        
        wx.hideLoading()
      } catch (e) {
        wx.hideLoading()
        wx.showToast({ title: '上传失败', icon: 'none' })
        console.error('upload error:', e)
      }
    }
  },

  onPreviewAvatar() {
    const { avatar, avatarCloudPath } = this.data
    
    if (!avatar) return
    
    if (avatar.startsWith('http')) {
      wx.previewImage({
        urls: [avatar]
      })
      return
    }
    
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.getTempFileURL({
      fileList: [avatarCloudPath || avatar],
      success: (res) => {
        wx.hideLoading()
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          wx.previewImage({
            urls: [res.fileList[0].tempFileURL]
          })
        } else {
          wx.showToast({ title: '获取图片失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('getTempFileURL error:', err)
        wx.showToast({ title: '获取图片失败', icon: 'none' })
      }
    })
  },

  onDeleteAvatar() {
    const { avatar, avatarCloudPath } = this.data
    if (!avatar) return
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除头像吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 
            avatar: '', 
            avatarCloudPath: '',
            avatarToDelete: avatarCloudPath || ''
          })
        }
      }
    })
  },

  async onSave() {
    const { name, gender, generation, birthYear, deathYear, fatherId, motherId, rankTitle, bio, avatar, avatarCloudPath, avatarToDelete, id, isEdit, fatherIndex, motherIndex, fatherOptions, motherOptions } = this.data
    
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    if (fatherIndex >= 0 && fatherOptions[fatherIndex]) {
      const father = fatherOptions[fatherIndex]
      if (father.gender !== '男') {
        wx.showToast({ title: '父亲必须是男性', icon: 'none' })
        return
      }
    }

    if (motherIndex >= 0 && motherOptions[motherIndex]) {
      const mother = motherOptions[motherIndex]
      if (mother.gender !== '女') {
        wx.showToast({ title: '母亲必须是女性', icon: 'none' })
        return
      }
    }

    if (fatherId && motherId && fatherId === motherId) {
      wx.showToast({ title: '父亲和母亲不能是同一人', icon: 'none' })
      return
    }

    if (id && (fatherId === id || motherId === id)) {
      wx.showToast({ title: '不能选择自己作为父母', icon: 'none' })
      return
    }

    const db = wx.cloud.database()
    const currentSpouses = this.data.spouses || []
    const originalSpouses = this.data.originalSpouses || []
    
    // 找出移除和新增的配偶
    const removedSpouses = originalSpouses.filter(sid => !currentSpouses.includes(sid))
    const addedSpouses = currentSpouses.filter(sid => !originalSpouses.includes(sid))

    let finalGeneration = generation
    if (fatherId && fatherIndex >= 0 && fatherOptions[fatherIndex]) {
      finalGeneration = (fatherOptions[fatherIndex].generation || 1) + 1
    } else if (!fatherId && !id) {
      finalGeneration = 1
    }

    this.setData({ loading: true })
    const dataToSave = {
      name: name.trim(),
      gender,
      generation: finalGeneration,
      birthYear,
      deathYear,
      spouses: currentSpouses,
      fatherId,
      motherId,
      rankTitle: rankTitle.trim(),
      bio,
      avatar: avatarCloudPath || '',
      updateTime: db.serverDate()
    }

    try {
      let currentId = id
      if (isEdit) {
        await db.collection('members').doc(id).update({ data: dataToSave })
        
        if (fatherId && fatherIndex >= 0 && fatherOptions[fatherIndex]) {
          const newFatherGen = fatherOptions[fatherIndex].generation || 1
          await this.updateDescendantsGeneration(db, id, newFatherGen + 1)
        }
      } else {
        dataToSave.createTime = db.serverDate()
        const res = await db.collection('members').add({ data: dataToSave })
        currentId = res._id
      }
      
      // 同步处理关联配偶的数据一致性
      // 1. 清除移除配偶的关联
      for (const spouseId of removedSpouses) {
        if (spouseId) {
          const spouseMember = await db.collection('members').doc(spouseId).get()
          if (spouseMember.data) {
            const updatedSpouses = (spouseMember.data.spouses || []).filter(sid => sid !== currentId)
            await db.collection('members').doc(spouseId).update({
              data: { spouses: updatedSpouses }
            })
          }
        }
      }
      
      // 2. 添加新增配偶的关联
      for (const spouseId of addedSpouses) {
        if (spouseId) {
          const spouseMember = await db.collection('members').doc(spouseId).get()
          if (spouseMember.data) {
            const currentSpousesOfSpouse = spouseMember.data.spouses || []
            if (!currentSpousesOfSpouse.includes(currentId)) {
              await db.collection('members').doc(spouseId).update({
                data: { spouses: [...currentSpousesOfSpouse, currentId] }
              })
            }
          }
        }
      }
      
      wx.showToast({ title: '保存成功' })
      
      if (avatarToDelete) {
        try {
          await wx.cloud.deleteFile({
            fileList: [avatarToDelete]
          })
        } catch (e) {
          console.error('delete avatar error:', e)
        }
      }
      
      const app = getApp()
      app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
      wx.setStorageSync('member_version', app.globalData.membersVersion)
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (e) {
      console.error('Save error:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async updateDescendantsGeneration(db, parentId, parentGeneration) {
    const { data: children } = await db.collection('members').where({
      fatherId: parentId
    }).get()

    for (const child of children) {
      await db.collection('members').doc(child._id).update({
        data: { generation: parentGeneration + 1 }
      })
      await this.updateDescendantsGeneration(db, child._id, parentGeneration + 1)
    }
  }
})
