const cacheManager = require('../../utils/cacheManager.js')

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
    avatarToDelete: '',
    hasGrave: false,
    graveCount: 0
  },

  onShow() {
    if (this.data.id && this.data.avatarCloudPath) {
      this.convertAvatarToTempUrl(this.data.avatarCloudPath).then(tempUrl => {
        if (tempUrl && tempUrl !== this.data.avatar) {
          this.setData({ avatar: tempUrl })
        }
      })
    }
  },

  onLoad(options) {
    const app = getApp()
    const familyId = app.globalData.familyId

    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      this.loadMember(options.id, options.generation, familyId)
    } else {
      const generation = parseInt(options.generation) || 1
      this.setData({ generation })
      this.loadAllMembers(null, null, familyId)
    }
  },

  async convertAvatarToTempUrl(avatarPath) {
    if (!avatarPath) return ''
    if (avatarPath.startsWith('http')) return avatarPath

    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [avatarPath]
      })

      if (res.fileList && res.fileList[0]) {
        const fileInfo = res.fileList[0]
        if (fileInfo.tempFileURL) {
          return fileInfo.tempFileURL
        }
        if (fileInfo.status === 0 && fileInfo.fileID) {
          return fileInfo.fileID
        }
      }
    } catch (e) {
      console.error('convertAvatarToTempUrl error:', e)
    }

    if (avatarPath.startsWith('cloud://')) {
      return avatarPath
    }
    return ''
  },

  async loadMember(id, generationFromTree, familyId) {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
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
          data = result.result.data.find(m => m._id === id)
        }
      } else {
        const res = await db.collection('members').doc(id).get()
        data = res.data
      }

      if (data) {
        const getMemberName = (memberId) => {
          if (!memberId) return ''
          const member = this.data.members.find(m => m._id === memberId)
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
        const displayAvatar = avatarTempUrl || data.avatar || ''

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
          avatar: displayAvatar,
          avatarCloudPath: data.avatar || ''
        }
        this.setData(updateData)
        await this.loadAllMembers(id, updateData.gender, familyId)
        this.checkGrave(id)
      } else {
        await this.loadAllMembers(null, null, familyId)
      }
    } catch (e) {
      console.error('Load member error:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async loadAllMembers(currentId, currentGender, familyId) {
    const db = wx.cloud.database()

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

    console.log('loadAllMembers - data length:', data.length, 'fatherOptions:', fatherOptions.length, 'motherOptions:', motherOptions.length, 'spouseOptions:', spouseOptions.length)

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
    }).filter(name => name)

    this.setData({
      spouses: newSpouses,
      spouseNames: newSpouseNames.join('、'),
      showSpouseModal: false
    })
  },

  onSpouseChange(e) {
    this.setData({
      selectedSpouses: e.detail.value
    })
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onBirthYearInput(e) {
    this.setData({ birthYear: e.detail.value })
  },

  onDeathYearInput(e) {
    this.setData({ deathYear: e.detail.value })
  },

  onRankTitleInput(e) {
    this.setData({ rankTitle: e.detail.value })
  },

  computeGeneration() {
    const { fatherId, motherId, members } = this.data
    let generation = 1
    if (fatherId) {
      const father = members.find(m => m._id === fatherId)
      if (father) {
        generation = (father.generation || 1) + 1
      }
    } else if (motherId) {
      const mother = members.find(m => m._id === motherId)
      if (mother) {
        generation = (mother.generation || 1) + 1
      }
    }
    this.setData({ generation })
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value })
  },

  onFatherChange(e) {
    const index = parseInt(e.detail.value)
    const father = this.data.fatherOptions[index]
    this.setData({
      fatherId: father ? father._id : '',
      motherId: father ? '' : this.data.motherId,
      motherIndex: father ? -1 : this.data.motherIndex,
      fatherIndex: index
    })
    this.computeGeneration()
  },

  onMotherChange(e) {
    const index = parseInt(e.detail.value)
    const mother = this.data.motherOptions[index]
    this.setData({
      motherId: mother ? mother._id : '',
      fatherId: mother ? '' : this.data.fatherId,
      fatherIndex: mother ? -1 : this.data.fatherIndex,
      motherIndex: index
    })
    this.computeGeneration()
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.setData({ avatar: tempFilePath })
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  async uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...' })
    try {
      const app = getApp()
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substr(2, 9)
      const cloudPath = `avatars/${timestamp}_${randomStr}.jpg`

      await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      this.setData({ avatarCloudPath: cloudPath })
      wx.hideLoading()
    } catch (e) {
      console.error('Upload avatar error:', e)
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  removeAvatar() {
    if (this.data.avatarCloudPath) {
      this.setData({ avatarToDelete: this.data.avatarCloudPath })
    }
    this.setData({
      avatar: '',
      avatarCloudPath: ''
    })
  },

  onChooseAvatar() {
    this.chooseAvatar()
  },

  onPreviewAvatar() {
    if (this.data.avatar) {
      wx.previewImage({
        urls: [this.data.avatar],
        current: this.data.avatar
      })
    }
  },

  onDeleteAvatar() {
    this.removeAvatar()
  },

  onSave() {
    this.saveMember()
  },

  async saveMember() {
    const { id, name, gender, birthYear, deathYear, spouses, fatherId, motherId, rankTitle, bio, avatarCloudPath, avatarToDelete, loading, members } = this.data

    if (loading) return

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    let generation = 1
    if (fatherId) {
      const father = members.find(m => m._id === fatherId)
      if (father) generation = (father.generation || 1) + 1
    } else if (motherId) {
      const mother = members.find(m => m._id === motherId)
      if (mother) generation = (mother.generation || 1) + 1
    }

    this.setData({ loading: true })

    try {
      const app = getApp()
      const currentSpouses = spouses || []
      const originalSpouses = this.data.originalSpouses || []

      const dataToSave = {
        name: name.trim(),
        gender,
        generation: parseInt(generation) || 1,
        birthYear: birthYear ? parseInt(birthYear) : '',
        deathYear: deathYear ? parseInt(deathYear) : '',
        spouses: currentSpouses,
        fatherId: fatherId || '',
        motherId: motherId || '',
        rankTitle: rankTitle.trim(),
        bio: bio.trim(),
        avatar: avatarCloudPath || ''
      }

      let savedId

      if (id) {
        const res = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataUpdate',
            collection: 'members',
            familyId: app.globalData.familyId,
            recordId: id,
            data: dataToSave
          }
        })
        if (!res.result?.success) {
          throw new Error(res.result?.errMsg || '更新失败')
        }
        savedId = id
      } else {
        const res = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataAdd',
            collection: 'members',
            familyId: app.globalData.familyId,
            data: dataToSave
          }
        })
        if (!res.result?.success) {
          throw new Error(res.result?.errMsg || '新增失败')
        }
        savedId = res.result.id
      }

      const spousesToAdd = currentSpouses.filter(s => !originalSpouses.includes(s))
      const spousesToRemove = originalSpouses.filter(s => !currentSpouses.includes(s))

      for (const spouseId of spousesToAdd) {
        if (spouseId && spouseId !== savedId) {
          const result = await wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'familyDataQuery',
              collection: 'members',
              familyId: app.globalData.familyId,
              limit: 100
            }
          })
          if (result.result?.success && result.result.data) {
            const spouseData = result.result.data.find(m => m._id === spouseId)
            if (spouseData) {
              const currentSpousesOfSpouse = spouseData.spouses || []
              if (!currentSpousesOfSpouse.includes(savedId)) {
                await wx.cloud.callFunction({
                  name: 'quickstartFunctions',
                  data: {
                    type: 'familyDataUpdate',
                    collection: 'members',
                    familyId: app.globalData.familyId,
                    recordId: spouseId,
                    data: { spouses: [...currentSpousesOfSpouse, savedId] }
                  }
                })
              }
            }
          }
        }
      }

      for (const spouseId of spousesToRemove) {
        if (spouseId && spouseId !== savedId) {
          const result = await wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'familyDataQuery',
              collection: 'members',
              familyId: app.globalData.familyId,
              limit: 100
            }
          })
          if (result.result?.success && result.result.data) {
            const spouseData = result.result.data.find(m => m._id === spouseId)
            if (spouseData) {
              const currentSpousesOfSpouse = (spouseData.spouses || []).filter(s => s !== savedId)
              await wx.cloud.callFunction({
                name: 'quickstartFunctions',
                data: {
                  type: 'familyDataUpdate',
                  collection: 'members',
                  familyId: app.globalData.familyId,
                  recordId: spouseId,
                  data: { spouses: currentSpousesOfSpouse }
                }
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

      const familyId = app.globalData.familyId
      try {
        const res = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: { type: 'incrementMembersVersion', familyId }
        })
        if (res.result && res.result.success) {
          app.globalData.membersVersion = res.result.membersVersion
        }
      } catch (e) {
        console.error('incrementMembersVersion error:', e)
      }
      cacheManager.invalidate(cacheManager.keys.members)

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

  async checkGrave(memberId) {
    if (!memberId) return

    const app = getApp()
    const db = wx.cloud.database()

    try {
      let { data } = []

      if (app.globalData.familyId) {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'familyDataQuery',
            collection: 'graves',
            familyId: app.globalData.familyId,
            limit: 100
          }
        })

        if (result.result && result.result.success && result.result.data) {
          data = result.result.data.filter(g => g.memberId === memberId)
        }
      } else {
        const res = await db.collection('graves')
          .where({ memberId: memberId })
          .get()
        data = res.data
      }

      this.setData({
        hasGrave: data && data.length > 0,
        graveCount: data ? data.length : 0
      })
    } catch (e) {
      console.error('checkGrave error:', e)
    }
  },

  onGraveTap() {
    const { id, hasGrave } = this.data

    if (hasGrave) {
      wx.navigateTo({
        url: `/pages/grave/grave?memberId=${id}`
      })
    } else {
      wx.navigateTo({
        url: `/pages/graveEdit/graveEdit?memberId=${id}`
      })
    }
  },

  preventScroll() {
    return false
  }
})