Component({
  properties: {
    members: {
      type: Array,
      value: []
    },
    rootId: {
      type: String,
      value: ''
    },
    itemMargin: {
      type: String,
      value: '10rpx'
    },
    lineColor: {
      type: String,
      value: '#8B4513'
    }
  },

  data: {
    treeData: null
  },

  lifetimes: {
    attached() {
      this.buildTreeData()
    }
  },

  observers: {
    'members, rootId': function() {
      this.buildTreeData()
    }
  },

  methods: {
    buildTreeData() {
      const { members, rootId } = this.properties
      
      if (!members || !members.length) {
        this.setData({ treeData: null })
        return
      }

      // 1. 建立 ID 映射表，仅用于查找，不存储嵌套
      const memberMap = {}
      members.forEach(m => {
        memberMap[m._id] = m
      })

      // 2. 确定根节点
      let rootNode = null
      if (rootId) {
        rootNode = memberMap[rootId]
      }
      if (!rootNode) {
        rootNode = members.find(m => !m.fatherId) || members[0]
      }

      // 3. 递归构建非循环树
      const buildNode = (node) => {
        if (!node) return null
        
        // 查找子女
        const children = members.filter(m => m.fatherId === node._id || m.motherId === node._id)
          .map(child => buildNode(child))

        // 查找配偶（单向浅拷贝，切断循环引用）
        let spouses = []
        const spouseIds = node.spouses && Array.isArray(node.spouses) ? node.spouses : []
        
        // 找到显式关联的配偶
        spouses = members.filter(m => {
          if (spouseIds.includes(m._id)) return true
          // 反向查找：对方关联了我
          if (m.spouses && Array.isArray(m.spouses) && m.spouses.includes(node._id)) return true
          return false
        }).map(s => ({
          _id: s._id,
          name: s.name,
          gender: s.gender,
          generation: s.generation,
          rankTitle: s.rankTitle,
          birthYear: s.birthYear,
          deathYear: s.deathYear,
          avatar: s.avatar
          // 注意：配偶节点下不再递归 children 或 spouses，防止循环
        }))

        return {
          ...node,
          children,
          spouses
        }
      }

      const treeData = buildNode(rootNode)
      
      // 4. 为每个节点添加 hasChildren 标记和动态间距
      const processNode = (node) => {
        if (!node) return
        
        const hasChildren = node.children && node.children.length > 0
        node.hasChildren = hasChildren
        
        node.itemMargin = '40rpx'
        
        if (node.children) {
          node.children.forEach(child => processNode(child))
        }
      }
      
      processNode(treeData)
      
      this.setData({ treeData })
    },

    onNodeTap(e) {
      const { id, generation } = e.detail
      this.triggerEvent('nodetap', { id, generation })
    }
  }
})
