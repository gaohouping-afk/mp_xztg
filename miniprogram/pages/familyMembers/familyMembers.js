const app = getApp()

Page({
  data: {
    loading: true,
    family: null,
    familyId: '',
    myOpenid: '',
    myRole: 'member',
    canManage: false,
    action: '',
    members: [],
    ownerList: [],
    adminList: [],
    memberList: [],
    viewerList: []
  },

  onLoad(options) {
    if (options.familyId) {
      this.setData({ familyId: options.familyId })
    } else if (app.globalData && app.globalData.familyId) {
      this.setData({ familyId: app.globalData.familyId })
    }

    if (options.action) {
      this.setData({ action: options.action })
      wx.setNavigationBarTitle({ title: '转让族长' })
    }
    this.loadMembers()
  },

  onShow() {
    this.loadMembers()
  },

  onPullDownRefresh() {
    this.loadMembers().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadMembers() {
    this.setData({ loading: true })

    try {
      if (!app.globalData) {
        app.globalData = {};
      }
      
      let openid = app.globalData.openid
      console.log('familyMembers loadMembers - initial openid:', openid)
      if (!openid) {
        console.log('familyMembers loadMembers - calling getOpenId')
        openid = await this.getOpenId()
        console.log('familyMembers loadMembers - got openid:', openid)
      }
      console.log('familyMembers loadMembers - final openid:', openid)
      console.log('familyMembers loadMembers - familyId:', this.data.familyId)

      this.setData({ myOpenid: openid })

      const db = wx.cloud.database()

      const membershipRes = await db.collection('family_members')
        .where({
          openid: openid,
          familyId: this.data.familyId
        })
        .limit(1)
        .get()
        
      console.log('familyMembers loadMembers - membershipRes:', membershipRes.data)

      if (membershipRes.data.length > 0) {
        const myMembership = membershipRes.data[0]
        const canManage = ['owner', 'admin'].includes(myMembership.role)

        this.setData({
          myRole: myMembership.role,
          canManage: canManage
        })

        const familyRes = await db.collection('families')
          .doc(this.data.familyId)
          .get()

        const membersRes = await db.collection('family_members')
          .where({
            familyId: this.data.familyId
          })
          .get()

        const members = membersRes.data.map(m => {
          let joinedAt = ''
          if (m.joinedAt) {
            const date = new Date(m.joinedAt)
            joinedAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          }
          return {
            ...m,
            joinedAt: joinedAt
          }
        })

        const ownerList = members.filter(m => m.role === 'owner')
        const adminList = members.filter(m => m.role === 'admin')
        const memberList = members.filter(m => m.role === 'member')
        const viewerList = members.filter(m => m.role === 'viewer')

        this.setData({
          family: familyRes.data,
          members: members,
          ownerList: ownerList,
          adminList: adminList,
          memberList: memberList,
          viewerList: viewerList,
          loading: false
        })
      } else {
        wx.showToast({ title: '您不是该家族成员', icon: 'none' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (e) {
      console.error('loadMembers error:', e)
      this.setData({ loading: false })
    }
  },

  onInvite() {
    if (!this.data.family) return

    wx.showModal({
      title: '邀请码',
      content: `家族邀请码：${this.data.family.inviteCode}\n分享给家人，让他们加入。`,
      confirmText: '复制邀请码',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: this.data.family.inviteCode,
            success: () => {
              wx.showToast({ title: '邀请码已复制' })
            }
          })
        }
      }
    })
  },

  onSetRole(e) {
    const { id, openid, current } = e.currentTarget.dataset

    if (!['owner', 'admin'].includes(this.data.myRole)) {
      wx.showToast({ title: '无权操作', icon: 'none' })
      return
    }

    let newRole = 'member'
    if (current === 'admin') {
      newRole = 'member'
    } else if (current === 'member' || current === 'viewer') {
      if (this.data.myRole === 'owner') {
        newRole = 'admin'
      } else {
        newRole = 'member'
      }
    }

    wx.showModal({
      title: '确认设置',
      content: `确定要将该成员设置为【${this.getRoleName(newRole)}】吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.updateMemberRole(id, openid, newRole)
        }
      }
    })
  },

  getRoleName(role) {
    const names = {
      owner: '族长',
      admin: '管理员',
      member: '成员',
      viewer: '只读'
    }
    return names[role] || role
  },

  async updateMemberRole(memberId, openid, newRole) {
    console.log('updateMemberRole called:', memberId, openid, newRole)
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'updateFamilyMemberRole',
          memberId: memberId,
          familyId: this.data.familyId,
          newRole: newRole
        }
      })
      console.log('updateMemberRole result:', res)
      if (res.result && res.result.success) {
        wx.showToast({ title: '设置成功', icon: 'success' })
        this.loadMembers()
      } else {
        wx.showToast({ title: res.result?.errMsg || '设置失败', icon: 'none' })
      }
    } catch (e) {
      console.error('updateMemberRole error:', e)
      wx.showToast({ title: '设置失败: ' + (e.message || e.errMsg || '未知错误'), icon: 'none' })
    }
  },

  onRemoveMember(e) {
    const { id, openid } = e.currentTarget.dataset

    if (!['owner', 'admin'].includes(this.data.myRole)) {
      wx.showToast({ title: '无权操作', icon: 'none' })
      return
    }

    if (openid === this.data.myOpenid) {
      wx.showToast({ title: '不能移除自己', icon: 'none' })
      return
    }

    const member = this.data.members.find(m => m._id === id)
    if (member && member.role === 'owner') {
      wx.showToast({ title: '不能移除族长', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认移除',
      content: '确定要将该成员从家族中移除吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.removeMember(id)
        }
      }
    })
  },

  async removeMember(memberId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'removeFamilyMember',
          memberId: memberId,
          familyId: this.data.familyId
        }
      })

      console.log('removeMember result:', res)

      if (res.result && res.result.success) {
        wx.showToast({ title: '已移除', icon: 'success' })
        this.loadMembers()
      } else {
        const errMsg = res.result?.errMsg || '移除失败'
        wx.showToast({ title: errMsg, icon: 'none' })
      }
    } catch (e) {
      console.error('removeMember error:', e)
      wx.showToast({ title: '移除失败', icon: 'none' })
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