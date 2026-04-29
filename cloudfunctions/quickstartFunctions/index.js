const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async (event) => {
  const path = event.path || 'pages/index/index'
  const scene = event.scene || ''

  try {
    const resp = await cloud.openapi.wxacode.get({
      path: path,
      scene: scene
    })

    const { buffer } = resp

    const timestamp = Date.now()
    const cloudPath = `qrcode/family_${timestamp}.png`

    const upload = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer,
    })

    return {
      fileID: upload.fileID,
      buffer: buffer.toString('base64')
    }
  } catch (e) {
    console.error('getMiniProgramCode error:', e)
    throw e
  }
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');

// 家族数据查询
const familyDataQuery = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { collection, familyId, orderBy, skip, limit } = event;

    console.log('familyDataQuery - openid:', openid);
    console.log('familyDataQuery - familyId:', familyId);
    console.log('familyDataQuery - collection:', collection);

    if (!familyId) {
      return { success: false, errMsg: 'familyId is required' };
    }

    // 验证用户是否是该家族的成员
    const membershipRes = await db.collection('family_members')
      .where({
        openid: openid,
        familyId: familyId
      })
      .limit(1)
      .get();

    console.log('familyDataQuery - membershipRes:', membershipRes.data);

    if (membershipRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    // 构建查询
    let query = db.collection(collection).where({
      familyId: familyId
    });

    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.order);
    }

    const countResult = await query.count();
    const total = countResult.total;

    console.log('familyDataQuery - total:', total);

    let data = [];
    if (total > 0) {
      const pageSize = limit || 20;
      const pageSkip = skip || 0;

      const fetchResult = await query
        .skip(pageSkip)
        .limit(pageSize)
        .get();

      data = fetchResult.data;
    }

    let membersVersion = 0
    try {
      const familyRes = await db.collection('families').doc(familyId).get()
      membersVersion = familyRes.data?.membersVersion || 0
    } catch (e) {
      console.error('familyDataQuery - get membersVersion error:', e)
    }

    return {
      success: true,
      data: data,
      total: total,
      membersVersion: membersVersion
    };
  } catch (e) {
    console.error('familyDataQuery error:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 移除家族成员
const removeFamilyMember = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { memberId, familyId } = event;

    console.log('removeFamilyMember - openid:', openid);
    console.log('removeFamilyMember - memberId:', memberId);
    console.log('removeFamilyMember - familyId:', familyId);

    if (!memberId || !familyId) {
      return { success: false, errMsg: 'memberId and familyId are required' };
    }

    // 验证操作者是否是该家族的管理员或族长
    const operatorRes = await db.collection('family_members')
      .where({
        openid: openid,
        familyId: familyId
      })
      .limit(1)
      .get();

    console.log('removeFamilyMember - operatorRes:', operatorRes.data);

    if (operatorRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const operatorRole = operatorRes.data[0].role;
    if (operatorRole !== 'owner' && operatorRole !== 'admin') {
      return { success: false, errMsg: 'Permission denied' };
    }

    // 获取要移除的成员信息
    const memberRes = await db.collection('family_members')
      .doc(memberId)
      .get();

    if (!memberRes.data) {
      return { success: false, errMsg: 'Member not found' };
    }

    // 不能移除族长
    if (memberRes.data.role === 'owner') {
      return { success: false, errMsg: 'Cannot remove owner' };
    }

    // 不能移除自己
    if (memberRes.data.openid === openid) {
      return { success: false, errMsg: 'Cannot remove yourself' };
    }

    // 执行移除
    await db.collection('family_members').doc(memberId).remove();

    // 更新家族成员数量
    await db.collection('families').doc(familyId).update({
      data: {
        memberCount: db.command.inc(-1),
        updatedAt: db.serverDate()
      }
    });

    return { success: true };
  } catch (e) {
    console.error('removeFamilyMember error:', e);
    return { success: false, errMsg: e.message || e };
  }
};

// 更新家族成员角色
const updateFamilyMemberRole = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { memberId, familyId, newRole } = event;

    console.log('updateFamilyMemberRole - openid:', openid);
    console.log('updateFamilyMemberRole - memberId:', memberId);
    console.log('updateFamilyMemberRole - familyId:', familyId);
    console.log('updateFamilyMemberRole - newRole:', newRole);

    if (!memberId || !familyId || !newRole) {
      return { success: false, errMsg: 'memberId, familyId and newRole are required' };
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(newRole)) {
      return { success: false, errMsg: 'Invalid role' };
    }

    const operatorRes = await db.collection('family_members')
      .where({
        openid: openid,
        familyId: familyId
      })
      .limit(1)
      .get();

    if (operatorRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const operatorRole = operatorRes.data[0].role;
    if (operatorRole !== 'owner' && operatorRole !== 'admin') {
      return { success: false, errMsg: 'Permission denied' };
    }

    const memberRes = await db.collection('family_members')
      .doc(memberId)
      .get();

    if (!memberRes.data) {
      return { success: false, errMsg: 'Member not found' };
    }

    if (memberRes.data.role === 'owner') {
      return { success: false, errMsg: 'Cannot change owner role' };
    }

    await db.collection('family_members').doc(memberId).update({
      data: {
        role: newRole,
        updatedAt: db.serverDate()
      }
    });

    return { success: true };
  } catch (e) {
    console.error('updateFamilyMemberRole error:', e);
    return { success: false, errMsg: e.message || e };
  }
};

// 增加家族成员版本号
const incrementMembersVersion = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { familyId } = event;

    console.log('incrementMembersVersion - openid:', openid);
    console.log('incrementMembersVersion - familyId:', familyId);

    if (!familyId) {
      return { success: false, errMsg: 'familyId is required' };
    }

    // 验证用户是否是该家族的成员
    const membershipRes = await db.collection('family_members')
      .where({
        openid: openid,
        familyId: familyId
      })
      .limit(1)
      .get();

    console.log('incrementMembersVersion - membershipRes:', membershipRes.data);

    if (membershipRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const operatorRole = membershipRes.data[0].role;
    if (operatorRole !== 'owner' && operatorRole !== 'admin') {
      return { success: false, errMsg: 'Permission denied' };
    }

    // 获取当前家族信息
    const familyRes = await db.collection('families').doc(familyId).get();
    
    if (!familyRes.data) {
      return { success: false, errMsg: 'Family not found' };
    }

    const currentVersion = familyRes.data.membersVersion || 0;

    // 更新版本号
    await db.collection('families').doc(familyId).update({
      data: {
        membersVersion: currentVersion + 1,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      membersVersion: currentVersion + 1
    };
  } catch (e) {
    console.error('incrementMembersVersion error:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 家族数据新增
const familyDataAdd = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { collection, familyId, data } = event;

    if (!familyId || !collection) {
      return { success: false, errMsg: 'familyId and collection are required' };
    }

    const membershipRes = await db.collection('family_members')
      .where({ openid: openid, familyId: familyId })
      .limit(1)
      .get();

    if (membershipRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const dataWithMeta = {
      ...data,
      familyId: familyId,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const addRes = await db.collection(collection).add({ data: dataWithMeta });

    return { success: true, id: addRes._id };
  } catch (e) {
    console.error('familyDataAdd error:', e);
    return { success: false, errMsg: e.message || e };
  }
};

// 家族数据更新
const familyDataUpdate = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { collection, familyId, recordId, data } = event;

    if (!familyId || !collection || !recordId) {
      return { success: false, errMsg: 'familyId, collection and recordId are required' };
    }

    const membershipRes = await db.collection('family_members')
      .where({ openid: openid, familyId: familyId })
      .limit(1)
      .get();

    if (membershipRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const recordRes = await db.collection(collection).doc(recordId).get();
    if (!recordRes.data || recordRes.data.familyId !== familyId) {
      return { success: false, errMsg: 'Record not found or access denied' };
    }

    await db.collection(collection).doc(recordId).update({
      data: { ...data, updateTime: db.serverDate() }
    });

    return { success: true };
  } catch (e) {
    console.error('familyDataUpdate error:', e);
    return { success: false, errMsg: e.message || e };
  }
};

// 家族数据删除
const familyDataRemove = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { collection, familyId, recordId } = event;

    if (!familyId || !collection || !recordId) {
      return { success: false, errMsg: 'familyId, collection and recordId are required' };
    }

    const membershipRes = await db.collection('family_members')
      .where({ openid: openid, familyId: familyId })
      .limit(1)
      .get();

    if (membershipRes.data.length === 0) {
      return { success: false, errMsg: 'Not a family member' };
    }

    const recordRes = await db.collection(collection).doc(recordId).get();
    if (!recordRes.data || recordRes.data.familyId !== familyId) {
      return { success: false, errMsg: 'Record not found or access denied' };
    }

    await db.collection(collection).doc(recordId).remove();

    return { success: true };
  } catch (e) {
    console.error('familyDataRemove error:', e);
    return { success: false, errMsg: e.message || e };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode(event);
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "familyDataQuery":
      return await familyDataQuery(event);
    case "removeFamilyMember":
      return await removeFamilyMember(event, context);
    case "updateFamilyMemberRole":
      return await updateFamilyMemberRole(event, context);
    case "incrementMembersVersion":
      return await incrementMembersVersion(event, context);
    case "familyDataAdd":
      return await familyDataAdd(event, context);
    case "familyDataUpdate":
      return await familyDataUpdate(event, context);
    case "familyDataRemove":
      return await familyDataRemove(event, context);
  }
};
