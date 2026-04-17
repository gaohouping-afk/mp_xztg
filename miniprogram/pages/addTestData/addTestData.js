const { historyData } = require('./historyData.js');
const { storyData } = require('./storyData.js');

Page({
  data: {
    loading: false,
    progress: 0,
    total: 0,
    statusText: ''
  },

  async addTestData() {
    if (this.data.loading) return;
    this.setData({ 
      loading: true, 
      progress: 0, 
      total: historyData.length,
      statusText: '准备中...'
    });
    
    const db = wx.cloud.database();
    const membersCol = db.collection('members');
    const storiesCol = db.collection('stories');
    const tempToCloudIdMap = {};

    try {
      // 1. 清空现有数据 (分批清空)
      this.setData({ statusText: '正在清空现有数据...' });
      
      let hasMore = true;
      while (hasMore) {
        const { data } = await membersCol.limit(20).get();
        if (data.length === 0) {
          hasMore = false;
        } else {
          for (const doc of data) {
            await membersCol.doc(doc._id).remove();
          }
        }
      }
      
      hasMore = true;
      while (hasMore) {
        const { data } = await storiesCol.limit(20).get();
        if (data.length === 0) {
          hasMore = false;
        } else {
          for (const doc of data) {
            await storiesCol.doc(doc._id).remove();
          }
        }
      }
      console.log('数据库已清空');

      // 2. 第一遍遍历：添加所有成员基本信息
      this.setData({ statusText: '正在导入成员基本信息...' });
      for (let i = 0; i < historyData.length; i++) {
        const member = historyData[i];
        const dataToSave = {
          name: member.name,
          gender: member.gender,
          generation: member.generation,
          rankTitle: member.rankTitle || '',
          birthYear: member.birthYear || '',
          deathYear: member.deathYear || '',
          bio: member.bio || '',
          spouses: [], // 初始为空，待第二遍更新
          fatherId: '', // 初始为空
          motherId: '', // 初始为空
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };

        const res = await membersCol.add({ data: dataToSave });
        tempToCloudIdMap[member.tempId] = res._id;

        this.setData({ 
          progress: i + 1,
          statusText: `导入中: ${i + 1}/${historyData.length}`
        });
      }

      // 3. 第二遍遍历：更新关联关系 (fatherId, motherId, spouses)
      this.setData({ statusText: '正在建立家族关联关系...' });
      for (let i = 0; i < historyData.length; i++) {
        const member = historyData[i];
        const cloudId = tempToCloudIdMap[member.tempId];
        const updates = {};

        if (member.fatherId && tempToCloudIdMap[member.fatherId]) {
          updates.fatherId = tempToCloudIdMap[member.fatherId];
        }
        if (member.motherId && tempToCloudIdMap[member.motherId]) {
          updates.motherId = tempToCloudIdMap[member.motherId];
        }
        if (member.spouses && Array.isArray(member.spouses)) {
          updates.spouses = member.spouses
            .map(tempId => tempToCloudIdMap[tempId])
            .filter(id => id);
        }

        if (Object.keys(updates).length > 0) {
          await membersCol.doc(cloudId).update({ data: updates });
        }

        this.setData({ 
          statusText: `关联中: ${i + 1}/${historyData.length}`
        });
      }

      // 4. 导入迁徙故事
      this.setData({ statusText: '正在导入迁徙故事...', total: storyData.length, progress: 0 });
      
      for (let i = 0; i < storyData.length; i++) {
        const story = storyData[i];
        
        let relatedMembersIds = [];
        if (story.relatedMembers) {
          const names = story.relatedMembers.split(',').map(n => n.trim());
          for (const name of names) {
            const { data: members } = await membersCol.where({ name: name }).get();
            if (members.length > 0) {
              relatedMembersIds.push(members[0]._id);
            }
          }
        }

        const dataToSave = {
          title: story.title,
          year: story.year,
          yearOrder: story.yearOrder || 0,
          location: story.location,
          description: story.description,
          content: story.content,
          relatedMembers: story.relatedMembers || '',
          relatedMembersIds: relatedMembersIds,
          images: [],
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };

        await storiesCol.add({ data: dataToSave });

        this.setData({ 
          progress: i + 1,
          statusText: `导入故事: ${i + 1}/${storyData.length}`
        });
      }

      wx.showToast({
        title: '测试数据导入成功',
        icon: 'success'
      });
      
      const app = getApp()
      app.globalData.membersVersion = (app.globalData.membersVersion || 0) + 1
      app.globalData.storiesVersion = (app.globalData.storiesVersion || 0) + 1
      
      this.setData({ statusText: '导入完成！' });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (err) {
      console.error('导入失败:', err);
      wx.showToast({
        title: '导入失败',
        icon: 'none'
      });
      this.setData({ statusText: '导入出错，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
