const CACHE_PREFIX = 'xztg_cache_'
const VERSION_SUFFIX = '_version'

module.exports = {
  keys: {
    members: 'members',
    graves: 'graves',
    stories: 'stories'
  },

  get(key, familyId) {
    const cacheKey = familyId
      ? `${CACHE_PREFIX}${key}_${familyId}`
      : `${CACHE_PREFIX}${key}`
    const versionKey = `${key}${VERSION_SUFFIX}`

    return {
      data: wx.getStorageSync(cacheKey),
      version: wx.getStorageSync(versionKey)
    }
  },

  set(key, familyId, data, version) {
    const cacheKey = familyId
      ? `${CACHE_PREFIX}${key}_${familyId}`
      : `${CACHE_PREFIX}${key}`
    const versionKey = `${key}${VERSION_SUFFIX}`

    wx.setStorageSync(cacheKey, data)
    wx.setStorageSync(versionKey, version)
  },

  clear(key, familyId) {
    const cacheKey = familyId
      ? `${CACHE_PREFIX}${key}_${familyId}`
      : `${CACHE_PREFIX}${key}`
    wx.removeStorageSync(cacheKey)
  },

  clearByFamily(familyId) {
    if (!familyId) return
    this.clear(this.keys.members, familyId)
    this.clear(this.keys.graves, familyId)
    this.clear(this.keys.stories, familyId)
  },

  clearAll() {
    const keys = ['members', 'graves', 'stories', 'familyTree']
    keys.forEach(key => {
      wx.removeStorageSync(`${key}${VERSION_SUFFIX}`)
      const allKeys = wx.getStorageInfoSync().keys || []
      allKeys.forEach(k => {
        if (k.startsWith(`${CACHE_PREFIX}${key}`)) {
          wx.removeStorageSync(k)
        }
      })
    })
  },

  invalidate(key) {
    const versionKey = `${key}${VERSION_SUFFIX}`
    wx.removeStorageSync(versionKey)
  },

  invalidateAll() {
    const keys = ['members', 'graves', 'stories']
    keys.forEach(key => {
      this.invalidate(key)
    })
  }
}