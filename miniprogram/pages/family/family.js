const cacheManager = require('../../utils/cacheManager.js')
const roleLabels = {
  owner: '族长',
  admin: '管理员',
  member: '成员',
  viewer: '只读'
}

const app = getApp()

Page({
  data: {
    loading: true,
    family: null,
    myRole: 'owner',
    myRoleLabel: '族长',
    memberCount: 0,
    myFamilies: [],
    showFamilyPicker: false,
    roleLabels: roleLabels,
    qrcodeUrl: '',
    showQRCodeModal: false,
    modalQRCodeUrl: '',
    inputInviteCode: '',
    previewFamily: null,
    joining: false
  },

  isCreatingFamily: false,  // deprecated, use createFamilyPromise instead
  hasLoadedOnce: false,
  createFamilyPromise: null,

  onLoad(options) {
    if (options.joinFamilyId && options.inviteCode) {
      this.setData({
        inputInviteCode: options.inviteCode,
        previewFamily: {
          _id: options.joinFamilyId,
          name: '加载中...',
          memberCount: 0,
          ownerName: ''
        }
      })
      this.onPreviewInviteCode()
    }
    this.checkFamilyMembership()
  },

  onShow() {
    if (this.hasLoadedOnce && this.data.family) {
      return
    }
    this.checkFamilyMembership()
  },

  async refreshCurrentFamily() {
    if (!this.data.family || !this.data.family._id) return

    try {
      const db = wx.cloud.database()
      const res = await db.collection('families').doc(this.data.family._id).get()

      if (res.data) {
        const newInviteCode = res.data.inviteCode
        console.log('refreshCurrentFamily - old code:', this.data.family.inviteCode)
        console.log('refreshCurrentFamily - new code from DB:', newInviteCode)
        this.setData({
          'family.inviteCode': newInviteCode,
          'family.name': res.data.name,
          'family.memberCount': res.data.memberCount
        })
        console.log('refreshCurrentFamily - setData done, calling generateQRCode with:', newInviteCode)
        this.generateQRCode(newInviteCode)
      }
    } catch (e) {
      console.error('refreshCurrentFamily error:', e)
    }
  },

  async checkFamilyMembership() {
    if (this.createFamilyPromise) {
      console.log('checkFamilyMembership - waiting for existing promise...')
      try {
        await this.createFamilyPromise
      } catch (e) {
        console.error('checkFamilyMembership - promise error:', e)
      }
      return
    }

    this.setData({ loading: true })

    try {
      if (!app.globalData) {
        app.globalData = {};
      }

      let openid = app.globalData.openid
      if (!openid) {
        openid = await this.getOpenId()
      }

      const db = wx.cloud.database()

      const membershipRes = await db.collection('family_members')
        .where({
          openid: openid
        })
        .get()

      if (membershipRes.data.length > 0) {
        const families = []
        const invalidMemberships = []

        for (const membership of membershipRes.data) {
          try {
            const familyRes = await db.collection('families')
              .doc(membership.familyId)
              .get()

            if (familyRes.data) {
              const countRes = await db.collection('family_members')
                .where({
                  familyId: membership.familyId
                })
                .count()

              const familyData = {
                _id: familyRes.data._id,
                name: familyRes.data.name,
                inviteCode: familyRes.data.inviteCode,
                role: membership.role,
                memberCount: countRes.total,
                isDefault: familyRes.data.isDefault || false
              }

              if (familyData.isDefault) {
                app.globalData.defaultFamilyId = familyRes.data._id
              }

              families.push(familyData)
            } else {
              invalidMemberships.push(membership._id)
            }
          } catch (e) {
            console.warn('Family not found or access denied:', membership.familyId)
            invalidMemberships.push(membership._id)
          }
        }

        if (invalidMemberships.length > 0) {
          console.log('Cleaning up invalid memberships:', invalidMemberships.length)
          for (const membershipId of invalidMemberships) {
            try {
              await db.collection('family_members').doc(membershipId).remove()
            } catch (e) {
              console.warn('Failed to remove invalid membership:', membershipId)
            }
          }
        }

        const currentFamilyId = app.globalData.familyId
        let currentFamily = families.find(f => f._id === currentFamilyId)
        if (!currentFamily && families.length > 0) {
          currentFamily = families[0]
        }

        if (currentFamily) {
          app.globalData.familyId = currentFamily._id
          app.globalData.familyName = currentFamily.name
        }

        console.log('checkFamilyMembership - membershipRes.data.length:', membershipRes.data.length)
        console.log('checkFamilyMembership - families.length:', families.length)
        console.log('checkFamilyMembership - currentFamilyId:', currentFamilyId)
        console.log('checkFamilyMembership - app.globalData.familyId:', app.globalData.familyId)
        console.log('checkFamilyMembership - app.globalData.defaultFamilyId:', app.globalData.defaultFamilyId)

        if (families.length === 0) {
          console.log('No valid families found, creating default family...')
          if (!this.createFamilyPromise) {
            this.createFamilyPromise = this._createDefaultFamilyInternal()
          }
          await this.createFamilyPromise
          this.hasLoadedOnce = true
        } else {
          this.setData({
            myFamilies: families,
            family: currentFamily || null,
            myRole: currentFamily?.role || 'member',
            myRoleLabel: roleLabels[currentFamily?.role] || '成员',
            memberCount: currentFamily?.memberCount || 0,
            loading: false
          })
          this.hasLoadedOnce = true
          if (currentFamily) {
            this.generateQRCode()
          }
        }
      } else {
        this.setData({
          myFamilies: [],
          family: null,
          loading: false
        })

        if (!this.createFamilyPromise) {
          this.createFamilyPromise = this._createDefaultFamilyInternal()
        }
        await this.createFamilyPromise
        this.hasLoadedOnce = true
      }
    } catch (e) {
      console.error('checkFamilyMembership error:', e)
      this.setData({ loading: false })
    }
  },

  async getOpenId() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getOpenId'
        },
        success: (res) => {
          console.log('getOpenId success:', res)
          if (!app.globalData) {
            app.globalData = {};
          }
          app.globalData.openid = res.result && res.result.openid
          resolve(app.globalData.openid)
        },
        fail: (err) => {
          console.error('getOpenId error:', err)
          reject(err)
        }
      })
    })
  },

  onCreateFamily() {
    wx.navigateTo({
      url: '/pages/familyCreate/familyCreate'
    })
  },

  onJoinFamily() {
    wx.navigateTo({
      url: '/pages/familyJoin/familyJoin'
    })
  },

  async _createDefaultFamilyInternal() {
    console.log('_createDefaultFamilyInternal started...')

    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid

      if (!openid) {
        console.log('createDefaultFamily - no openid, skipping')
        return
      }

      const existingDefault = await db.collection('families')
        .where({
          ownerId: openid,
          isDefault: true
        })
        .limit(1)
        .get()

      if (existingDefault.data.length > 0) {
        console.log('createDefaultFamily - default family already exists:', existingDefault.data[0]._id)
        const existingFamily = existingDefault.data[0]
        app.globalData.defaultFamilyId = existingFamily._id
        app.globalData.familyId = existingFamily._id
        app.globalData.familyName = existingFamily.name

        this.setData({
          family: {
            _id: existingFamily._id,
            name: existingFamily.name,
            inviteCode: existingFamily.inviteCode
          },
          myFamilies: [{
            _id: existingFamily._id,
            name: existingFamily.name,
            inviteCode: existingFamily.inviteCode,
            role: 'owner',
            memberCount: existingFamily.memberCount || 1,
            isDefault: true
          }],
          myRole: 'owner',
          myRoleLabel: '族长',
          memberCount: existingFamily.memberCount || 1,
          loading: false
        })
        return
      }

      let defaultName = '我的家族'
      try {
        const userInfo = await wx.getUserInfo()
        if (userInfo && userInfo.userInfo && userInfo.userInfo.nickName) {
          defaultName = userInfo.userInfo.nickName + '的家族'
        }
      } catch (e) {
        console.log('getUserInfo failed, use default name')
      }

      const inviteCode = this.generateInviteCode()

      const familyRes = await db.collection('families').add({
        data: {
          name: defaultName,
          inviteCode: inviteCode,
          ownerId: openid,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
          memberCount: 1,
          isDefault: true
        }
      })

      await db.collection('family_members').add({
        data: {
          familyId: familyRes._id,
          openid: openid,
          role: 'owner',
          joinedAt: db.serverDate(),
          joinedBy: openid,
          updatedAt: db.serverDate()
        }
      })

      await this.migrateUserDataToFamily(familyRes._id)

      app.globalData.familyId = familyRes._id
      app.globalData.familyName = familyRes.name
      app.globalData.defaultFamilyId = familyRes._id

      this.setData({
        family: {
          _id: familyRes._id,
          name: defaultName,
          inviteCode: inviteCode
        },
        myFamilies: [{
          _id: familyRes._id,
          name: defaultName,
          inviteCode: inviteCode,
          role: 'owner',
          memberCount: 1,
          isDefault: true
        }],
        myRole: 'owner',
        myRoleLabel: '族长',
        memberCount: 1,
        loading: false
      })

      wx.showToast({ title: '已创建默认家族', icon: 'success' })

    } catch (e) {
      console.error('_createDefaultFamilyInternal error:', e)
      this.setData({ loading: false })
    } finally {
      this.createFamilyPromise = null
    }
  },

  async migrateUserDataToFamily(familyId) {
    console.log('migrateUserDataToFamily called with familyId:', familyId)
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid

      if (!openid) {
        console.log('migrateUserDataToFamily: no openid, skipping')
        return
      }

      console.log('migrateUserDataToFamily: openid is', openid)

      const membersUpdate = await db.collection('members').where({
        _openid: openid
      }).update({
        data: {
          familyId: familyId
        }
      })
      console.log('members updated:', membersUpdate)

      await db.collection('graves').where({
        _openid: openid
      }).update({
        data: {
          familyId: familyId
        }
      })

      await db.collection('stories').where({
        _openid: openid
      }).update({
        data: {
          familyId: familyId
        }
      })

      console.log('User data migrated to family:', familyId)
    } catch (e) {
      console.error('migrateUserDataToFamily error:', e)
    }
  },

  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  },

  onManageMembers() {
    if (!this.data.family) {
      wx.showToast({ title: '请先创建或加入家族', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/familyMembers/familyMembers?familyId=${this.data.family._id}`
    })
  },

  onShareAppMessage() {
    if (!this.data.family) {
      return {
        title: '寻公问祖 - 家族纪念平台',
        path: '/pages/index/index'
      }
    }

    return {
      title: `邀请您加入「${this.data.family.name}」家族`,
      path: `/pages/family/family?joinFamilyId=${this.data.family._id}&inviteCode=${this.data.family.inviteCode}`,
      imageUrl: this.data.qrcodeUrl
    }
  },

  onCopyInviteCode() {
    if (!this.data.family) return
    
    wx.setClipboardData({
      data: this.data.family.inviteCode,
      success: () => {
        wx.showToast({ title: '邀请码已复制' })
      }
    })
  },

  onFamilySettings() {
    wx.navigateTo({
      url: `/pages/familySettings/familySettings?familyId=${this.data.family._id}`
    })
  },

  onSwitchFamily() {
    if (this.data.myFamilies.length <= 1) {
      wx.showToast({ title: '您只属于一个家族', icon: 'none' })
      return
    }
    this.setData({ showFamilyPicker: true })
  },

  hideFamilyPicker() {
    this.setData({ showFamilyPicker: false })
  },

  async onSelectFamily(e) {
    const familyId = e.currentTarget.dataset.id
    if (!familyId || familyId === this.data.family._id) {
      this.setData({ showFamilyPicker: false })
      return
    }

    const selectedFamily = this.data.myFamilies.find(f => f._id === familyId)
    if (!selectedFamily) return

    app.globalData.familyId = familyId
    app.globalData.familyName = selectedFamily.name
    app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
    app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1
    app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1

    cacheManager.clearByFamily(this.data.family._id)

    this.setData({
      family: selectedFamily,
      myRole: selectedFamily.role,
      myRoleLabel: roleLabels[selectedFamily.role] || '成员',
      memberCount: selectedFamily.memberCount,
      showFamilyPicker: false,
      qrcodeUrl: ''
    })

    wx.showToast({
      title: `已切换到${selectedFamily.name}`,
      icon: 'success'
    })

    this.generateQRCode()
  },

  async generateQRCode(inviteCode) {
    if (!this.data.family) return

    const code = inviteCode || this.data.family.inviteCode
    this.setData({ qrcodeUrl: '' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMiniProgramCode',
          path: 'pages/family/family',
          scene: code
        }
      })

      if (res.result) {
        if (res.result.fileID) {
          this.setData({ qrcodeUrl: res.result.fileID })
        } else if (res.result.buffer) {
          this.setData({ qrcodeUrl: `data:image/png;base64,${res.result.buffer}` })
        }
      }
    } catch (e) {
      console.error('generateQRCode error:', e)
      this.setData({ qrcodeUrl: '' })
    }
  },

  onShowQRCode() {
    if (!this.data.family) return

    if (!this.data.modalQRCodeUrl) {
      this.generateModalQRCode()
    }

    this.setData({ showQRCodeModal: true })
  },

  async generateModalQRCode() {
    if (!this.data.family) return

    try {
      const familyId = this.data.family._id
      const inviteCode = this.data.family.inviteCode
      const scene = encodeURIComponent(`${familyId}:${inviteCode}`)

      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMiniProgramCode',
          path: 'pages/family/family',
          scene: scene
        }
      })

      if (res.result) {
        if (res.result.fileID) {
          this.setData({ modalQRCodeUrl: res.result.fileID })
        } else if (res.result.buffer) {
          this.setData({ modalQRCodeUrl: `data:image/png;base64,${res.result.buffer}` })
        }
      }
    } catch (e) {
      console.error('generateModalQRCode error:', e)
    }
  },

  hideQRCodeModal() {
    this.setData({ showQRCodeModal: false })
  },

  onScanQRCode() {
    if (!this.data.family) return

    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        let inviteCode = ''

        if (res.path) {
          try {
            const url = 'https://example.com?' + res.path.split('?')[1] || ''
            const match = url.match(/scene=([^&]+)/)
            if (match) {
              inviteCode = decodeURIComponent(match[1])
            }
          } catch (e) {}
        }

        if (!inviteCode && res.result) {
          const match = res.result.match(/scene=([^&]+)/)
          if (match) {
            inviteCode = decodeURIComponent(match[1])
          }
        }

        if (inviteCode && inviteCode.length === 6) {
          inviteCode = inviteCode.toUpperCase()
          this.setData({ inputInviteCode: inviteCode, previewFamily: null })
          this.onPreviewInviteCode()
        } else {
          wx.showToast({ title: '请手动输入邀请码', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.showToast({ title: '扫码失败', icon: 'none' })
      }
    })
  },

  onInviteCodeInput(e) {
    const code = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    this.setData({ inputInviteCode: code, previewFamily: null })
  },

  async onPreviewInviteCode() {
    const inviteCode = this.data.inputInviteCode
    if (!inviteCode || inviteCode.length !== 6) {
      return
    }

    try {
      const db = wx.cloud.database()
      const res = await db.collection('families')
        .where({
          inviteCode: inviteCode
        })
        .limit(1)
        .get()

      if (res.data.length > 0) {
        const family = res.data[0]

        const ownerRes = await db.collection('family_members')
          .where({
            familyId: family._id,
            role: 'owner'
          })
          .limit(1)
          .get()

        let ownerName = '族长'
        if (ownerRes.data.length > 0 && ownerRes.data[0].nickname) {
          ownerName = ownerRes.data[0].nickname
        }

        this.setData({
          previewFamily: {
            _id: family._id,
            name: family.name,
            memberCount: family.memberCount,
            ownerName: ownerName
          }
        })
      } else {
        this.setData({ previewFamily: null })
        wx.showToast({ title: '邀请码无效', icon: 'none' })
      }
    } catch (e) {
      console.error('previewFamily error:', e)
      this.setData({ previewFamily: null })
    }
  },

  async onJoinFamily() {
    if (!this.data.previewFamily) {
      wx.showToast({ title: '请先查找家族', icon: 'none' })
      return
    }

    this.setData({ joining: true })

    try {
      if (!app.globalData) {
        app.globalData = {}
      }

      let openid = app.globalData.openid
      if (!openid) {
        openid = await this.getOpenId()
      }

      const db = wx.cloud.database()

      const existingRes = await db.collection('family_members')
        .where({
          openid: openid,
          familyId: this.data.previewFamily._id
        })
        .limit(1)
        .get()

      if (existingRes.data.length > 0) {
        wx.showToast({ title: '您已是该家族成员', icon: 'none' })
        this.setData({ joining: false })
        return
      }

      await db.collection('family_members').add({
        data: {
          familyId: this.data.previewFamily._id,
          openid: openid,
          role: 'member',
          joinedAt: db.serverDate(),
          joinedBy: 'invite',
          updatedAt: db.serverDate()
        }
      })

      await db.collection('families').doc(this.data.previewFamily._id).update({
        data: {
          memberCount: db.command.inc(1),
          updatedAt: db.serverDate()
        }
      })

      app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1
      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1

      wx.showToast({ title: '加入成功', icon: 'success' })

      this.setData({
        inputInviteCode: '',
        previewFamily: null,
        joining: false
      })

      setTimeout(() => {
        this.checkFamilyMembership()
      }, 1500)

    } catch (e) {
      console.error('joinFamily error:', e)
      wx.showToast({ title: '加入失败', icon: 'none' })
      this.setData({ joining: false })
    }
  },

  async getOpenId() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getOpenId'
        },
        success: (res) => {
          if (!app.globalData) {
            app.globalData = {}
          }
          app.globalData.openid = res.result && res.result.openid
          resolve(app.globalData.openid)
        },
        fail: (err) => {
          console.error('getOpenId error:', err)
          reject(err)
        }
      })
    })
  },

  onCreateFamily() {
    wx.navigateTo({
      url: '/pages/familyCreate/familyCreate'
    })
  },

  onJoinFamilyNavigate() {
    wx.navigateTo({
      url: '/pages/familyJoin/familyJoin'
    })
  },

  onScrollToInvite() {
    wx.pageScrollTo({
      selector: '.invite-card',
      duration: 300
    })
  }
})