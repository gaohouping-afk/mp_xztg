Component({
  properties: {
    dataSource: {
      type: Object,
      value: {}
    },
    isRoot: {
      type: Boolean,
      value: false
    },
    members: {
      type: Array,
      value: []
    },
    itemMargin: {
      type: String,
      value: '150rpx'
    },
    hasChildren: {
      type: Boolean,
      value: false
    },
    horizontalLineColor: {
      type: String,
      value: '#000'
    },
    verticalLineColor: {
      type: String,
      value: '#000'
    }
  },

  data: {
    children: [],
    spouses: [],
    generation: 1,
    hasChildren: false
  },

  lifetimes: {
    attached() {
      this.computeNodeData()
    }
  },

  observers: {
    'members, dataSource': function() {
      this.computeNodeData()
    }
  },

  methods: {
    computeNodeData() {
      const { dataSource } = this.properties
      
      if (!dataSource._id) {
        this.setData({ children: [], spouses: [], generation: 1 })
        return
      }
      
      this.setData({ 
        children: dataSource.children || [],
        spouses: dataSource.spouses || [],
        generation: dataSource.generation || 1,
        hasChildren: dataSource.hasChildren || false
      })
    },

    onItemTap(e) {
      const { id } = e.currentTarget.dataset
      const { dataSource } = this.properties
      // 如果点击的是主卡片且 dataset 中没 ID（不应该发生），则使用 dataSource ID
      const targetId = id || dataSource._id
      this.triggerEvent('nodetap', { id: targetId, generation: this.data.generation })
    },

    onChildNodeTap(e) {
      const { id, generation } = e.detail
      this.triggerEvent('nodetap', { id, generation })
    }
  }
})
