# 家族族谱小程序

![小程序截图](image.png)
> 📱 示例截图，实际界面以小程序为准

## 演示截图

| 首页 | 族谱树 | 成员管理 |
|:---:|:---:|:---:|
| ![首页](1.jpg) | ![族谱树](2.jpg) | ![成员管理](3.jpg) |

一个基于微信云开发的家族族谱管理小程序，支持族谱树展示、成员管理、迁徙故事等功能。

## 功能特点

- **族谱树可视化** - 直观展示家族成员关系树状图
- **成员管理** - 增删改查家族成员信息
- **迁徙故事** - 记录和展示家族迁徙历史
- **头像管理** - 支持成员头像上传、预览、删除
- **数据缓存** - 本地缓存加速加载，支持数据版本同步
- **云端存储** - 图片等文件存储在云端

## 技术栈

- 微信小程序原生开发
- 微信云开发（数据库、云存储、云函数）
- JavaScript

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口
├── app.json               # 小程序配置
├── app.wxss               # 全局样式
├── components/            # 自定义组件
│   └── familyTree/        # 族谱树组件
│       ├── familyTree.js
│       ├── familyTree.wxml
│       ├── familyTree.wxss
│       ├── tree-node.js
│       ├── tree-node.wxml
│       └── tree-node.wxss
└── pages/                 # 页面
    ├── index/              # 首页
    ├── familyTree/         # 族谱树页面
    ├── member/             # 成员列表
    ├── memberEdit/         # 成员编辑
    ├── story/              # 迁徙故事列表
    ├── storyDetail/        # 故事详情
    ├── storyEdit/          # 故事编辑
    └── addTestData/        # 测试数据
```

## 快速开始

### 1. 注册微信小程序

前往 [微信公众平台](https://mp.weixin.qq.com/) 注册一个小程序。

### 2. 开通云开发

1. 登录小程序管理后台
2. 进入「云开发」控制台
3. 创建云开发环境（免费版即可）

### 3. 配置云开发

修改 `miniprogram/app.js` 中的环境 ID：

```javascript
wx.cloud.init({
  env: 'your-env-id'  // 替换为你的云开发环境 ID
})
```

### 4. 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions` 文件夹，选择「上传并部署：云端安装依赖」。

如果没有 `cloudfunctions` 文件夹，需要在云开发控制台创建云函数。

### 5. 初始化数据库

首次部署需要初始化数据库集合：

1. 在小程序首页点击「初始化数据库」「添加测试数据」
2. 或在云开发控制台手动创建以下集合：
   - `members` - 成员数据
   - `stories` - 迁徙故事

## 数据结构

### members 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成唯一ID |
| name | string | 姓名 |
| gender | string | 性别（男/女） |
| generation | number | 代数 |
| birthYear | string | 出生年份 |
| deathYear | string | 逝世年份 |
| fatherId | string | 父亲ID |
| motherId | string | 母亲ID |
| spouses | array | 配偶ID数组 |
| rankTitle | string | 辈分称呼 |
| bio | string | 简介 |
| avatar | string | 头像云存储路径 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |

### stories 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成唯一ID |
| title | string | 标题 |
| year | string | 年份 |
| location | string | 地点 |
| description | string | 简介 |
| content | string | 详细内容 |
| relatedMembers | string | 相关成员 |
| images | array | 图片路径数组 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |

## 开发说明

### 本地开发

1. 使用微信开发者工具打开项目
2. 确保已配置好云开发环境
3. 点击预览即可在手机或模拟器中运行

### 数据缓存

项目实现了本地缓存机制：

- `familyTree_members` / `member_members` - 成员数据缓存
- `familyTree_version` / `member_version` - 数据版本号
- `story_stories` / `story_version` - 故事数据缓存

当云端数据更新时（版本号变化），自动刷新本地缓存。

### 清理数据

在首页点击「清理数据」可清除所有云端数据和本地缓存。

## 开源协议

GNU GENERAL PUBLIC LICENSE

## 贡献指南

欢迎提交 Issue 和 Pull Request！

