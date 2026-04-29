const app = getApp()

Page({
  data: {
    loading: true,
    family: null,
    familyId: '',
    myRole: 'member',
    myMembershipId: '',
    isDefault: false
  },

  onLoad(options) {
    if (options.familyId) {
      this.setData({ familyId: options.familyId })
      this.loadFamilyInfo()
    }
  },

  async loadFamilyInfo() {
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
          openid: openid,
          familyId: this.data.familyId
        })
        .limit(1)
        .get()

      if (membershipRes.data.length > 0) {
        const membership = membershipRes.data[0]
        this.setData({
          myRole: membership.role,
          myMembershipId: membership._id
        })

        const familyRes = await db.collection('families')
          .doc(this.data.familyId)
          .get()

        this.setData({
          family: familyRes.data,
          isDefault: familyRes.data.isDefault || false,
          loading: false
        })
      } else {
        wx.showToast({ title: '您不是该家族成员', icon: 'none' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (e) {
      console.error('loadFamilyInfo error:', e)
      this.setData({ loading: false })
    }
  },

  onEditName() {
    if (this.data.myRole !== 'owner') {
      wx.showToast({ title: '只有族长可以修改', icon: 'none' })
      return
    }

    wx.showModal({
      title: '修改家族名称',
      editable: true,
      placeholderText: '请输入新的家族名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateFamilyName(res.content.trim())
        }
      }
    })
  },

  async updateFamilyName(newName) {
    if (!newName) return

    try {
      const db = wx.cloud.database()
      await db.collection('families').doc(this.data.familyId).update({
        data: {
          name: newName,
          updatedAt: db.serverDate()
        }
      })

      this.setData({
        'family.name': newName
      })

      wx.showToast({ title: '修改成功', icon: 'success' })
    } catch (e) {
      console.error('updateFamilyName error:', e)
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
  },

  onCopyInviteCode() {
    wx.setClipboardData({
      data: this.data.family.inviteCode,
      success: () => {
        wx.showToast({ title: '邀请码已复制' })
      }
    })
  },

  async onRegenerateInviteCode() {
    if (this.data.myRole !== 'owner') return

    wx.showModal({
      title: '重新生成邀请码',
      content: '确定要重新生成邀请码吗？旧的邀请码将失效。',
      success: async (res) => {
        if (res.confirm) {
          await this.regenerateCode()
        }
      }
    })
  },

  async regenerateCode() {
    const newCode = this.generateInviteCode()

    try {
      const db = wx.cloud.database()
      await db.collection('families').doc(this.data.familyId).update({
        data: {
          inviteCode: newCode,
          updatedAt: db.serverDate()
        }
      })

      this.setData({
        'family.inviteCode': newCode
      })

      wx.showToast({ title: '已生成新邀请码', icon: 'success' })

      const pages = getCurrentPages()
      const familyPage = pages.find(p => p.route === 'pages/family/family')
      if (familyPage) {
        familyPage.refreshCurrentFamily()
      }
    } catch (e) {
      console.error('regenerateCode error:', e)
      wx.showToast({ title: '生成失败', icon: 'none' })
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

  async onTransferOwner() {
    if (this.data.myRole !== 'owner') return

    wx.navigateTo({
      url: `/pages/familyMembers/familyMembers?familyId=${this.data.familyId}&action=transfer`
    })
  },

  async onDisbandFamily() {
    if (this.data.myRole !== 'owner') {
      wx.showToast({ title: '只有族长可以解散', icon: 'none' })
      return
    }

    if (this.data.isDefault) {
      wx.showToast({ title: '默认家族无法解散', icon: 'none' })
      return
    }

    wx.showModal({
      title: '解散家族',
      content: '确定要解散该家族吗？此操作不可恢复！',
      success: async (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '再次确认',
            content: '所有成员将被移除，所有数据将无法恢复！',
            success: async (confirmRes) => {
              if (confirmRes.confirm) {
                await this.disbandFamily()
              }
            }
          })
        }
      }
    })
  },

  async disbandFamily() {
    wx.showLoading({ title: '处理中...' })

    try {
      const db = wx.cloud.database()

      await db.collection('family_members')
        .where({
          familyId: this.data.familyId
        })
        .remove()

      await db.collection('families')
        .doc(this.data.familyId)
        .remove()

      wx.hideLoading()
      wx.showToast({ title: '已解散家族', icon: 'success' })

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1500)
    } catch (e) {
      wx.hideLoading()
      console.error('disbandFamily error:', e)
      wx.showToast({ title: '解散失败', icon: 'none' })
    }
  },

  async onLeaveFamily() {
    if (this.data.isDefault) {
      wx.showToast({ title: '默认家族无法退出', icon: 'none' })
      return
    }

    wx.showModal({
      title: '退出家族',
      content: '确定要退出该家族吗？退出后将不再能查看该家族的数据。',
      success: async (res) => {
        if (res.confirm) {
          await this.leaveFamily()
        }
      }
    })
  },

  async leaveFamily() {
    wx.showLoading({ title: '处理中...' })

    try {
      const db = wx.cloud.database()

      await db.collection('family_members')
        .doc(this.data.myMembershipId)
        .remove()

      await db.collection('families').doc(this.data.familyId).update({
        data: {
          memberCount: db.command.inc(-1),
          updatedAt: db.serverDate()
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '已退出家族', icon: 'success' })

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1500)
    } catch (e) {
      wx.hideLoading()
      console.error('leaveFamily error:', e)
      wx.showToast({ title: '退出失败', icon: 'none' })
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
  }
})