const cacheManager = require('../../utils/cacheManager.js')

const app = getApp()

Page({
  data: {
    familyName: '',
    loading: false
  },

  onNameInput(e) {
    this.setData({
      familyName: e.detail.value.trim()
    })
  },

  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  },

  async onSubmit() {
    if (!this.data.familyName) {
      wx.showToast({ title: '请输入家族名称', icon: 'none' })
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

      const inviteCode = this.generateInviteCode()

      const existingDefault = await db.collection('families')
        .where({
          ownerId: openid,
          isDefault: true
        })
        .limit(1)
        .get()

      const isDefault = existingDefault.data.length === 0

      const familyRes = await db.collection('families').add({
        data: {
          name: this.data.familyName,
          inviteCode: inviteCode,
          ownerId: openid,
          isDefault: isDefault,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
          memberCount: 1
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

      app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
      app.globalData.gravesVersion = (app.globalData.gravesVersion || 0) + 1
      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1

      cacheManager.invalidateAll()

      wx.showToast({ title: '创建成功', icon: 'success' })

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1500)

    } catch (e) {
      console.error('createFamily error:', e)
      wx.showToast({ title: '创建失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  async migrateUserDataToFamily(familyId) {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid

      await db.collection('members').where({
        _openid: openid
      }).update({
        data: {
          familyId: familyId
        }
      })

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