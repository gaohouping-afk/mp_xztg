const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const collections = ['family_tree', 'members', 'stories']
  const results = []

  for (const name of collections) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
    } catch (e) {
      if (e.errCode === -1) {
        results.push({ collection: name, status: 'already exists' })
      } else {
        results.push({ collection: name, status: 'error', message: e.message })
      }
    }
  }

  const membersCollection = db.collection('members')
  const count = await membersCollection.count()
  
  if (count.total === 0) {
    const rootMember = {
      name: '始祖',
      gender: '男',
      generation: 1,
      birthYear: '',
      deathYear: '',
      spouse: '',
      fatherId: '',
      motherId: '',
      children: [],
      bio: '家族始祖',
      avatar: '',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    await membersCollection.add({
      data: rootMember
    })
    results.push({ action: 'init_root_member', status: 'done' })
  }

  return { success: true, results }
}
