<template>
  <component
    :is="tag"
    ref="wrapper"
  >
    <slot></slot>
  </component>
</template>

<script>
/* eslint-disable no-unused-vars */
import Sortable from "sortablejs";

/**
 * 修正index
 * 具体行为为获取当前是打开的expand的具体位置
 * 计算出每个expand容器tr的位置
 * 取最大的那个位置
 */
function fixIndex(sourceIndex, context) {
  const { expandRows } = context.store.states
  const { data } = context

  const indexOfExpandedRows = expandRows
    .map(row => data.indexOf(row))
    .map((rowIndex, index) => index + rowIndex + 1) // index 之前有几个展开了， rowIndex + 1， 不算之前已经展开的话，实际应该在的位置
  const offset = indexOfExpandedRows.filter(index => index < sourceIndex).length // 偏移量，也就是有几个expand的row小于当前row

  return sourceIndex - offset
}

export default {
  name: "ElementUiElTableDraggable",
  props: {
    tag: {
      type: String,
      default: "div"
    }
  },
  data() {
    return {
      // eslint-disable-next-line vue/no-reserved-keys
      _sortable: null,
      table: null,
      movingExpandedRowss: null
    }
  },
  methods: {
    init() {
      const context = window.__ElTableDraggableContext
      if (!this.$children[0] && !this.$children[0].$el) {
        throw new Error("添加slot")
      }

      this.destroy()

      this.table = this.$children[0].$el.querySelector(
        ".el-table__body-wrapper tbody"
      );

      const elTableContext = this.$children[0]
      context.set(this.table, elTableContext)

      this._sortable = Sortable.create(this.table, {
        // 绑定sortable的option
        ...this.$attrs,
        draggable: ".el-table__row",
        // 绑定事件
        ...Object.keys(this.$listeners).reduce((events, key) => {
          const handler = this.$listeners[key]
          // 首字母大写
          const eventName = `on${key.replace(/\b(\w)(\w*)/g, function($0, $1, $2) {
            return $1.toUpperCase() + $2.toLowerCase()
          })}`

          events[eventName] = (...args) => handler(...args)

          return events
        }, {}),
        // 开始的时候自动隐藏需要调整的
        onStart: (evt) => {
          const { item, oldIndex, from } = evt
          if (item.className.includes("expanded")) {
            // 正在拖拽的需要隐藏
            const expanded = item.nextSibling
            expanded.parentNode.removeChild(expanded)
            const sourceContext = context.get(from)
            const index = fixIndex(oldIndex, sourceContext)
            this.movingExpandedRows = sourceContext.data[index]
          }
          this.$emit('start', evt)
        },
        onEnd: (evt) => {
          const { to, from, pullMode } = evt
          const toContext = context.get(to)
          const toList = toContext.data
          const fromContext = context.get(from)
          const fromList = fromContext.data
          let { newIndex, oldIndex, } = evt

          /** expand模式下需要进行修正 */
          oldIndex = fixIndex(oldIndex, fromContext)
          newIndex = fixIndex(newIndex, toContext)

          const target = fromList[oldIndex]

          // move的情况
          if (pullMode !== 'clone') {
            fromList.splice(oldIndex, 1)
          }

          toList.splice(newIndex, 0, target)

          // change事件
          const affected = from === to ? [from] : [from, to]

          affected.forEach(table => {
            if (context.has(table)) {
              const tableContext = context.get(table)
              const draggableContext = tableContext.$parent

              // 修正expand，也就是将expand的部分全部重新绘制一遍
              if (this.movingExpandedRows) {
                // 缓存需要展开的row
                const row = this.movingExpandedRows
                tableContext.toggleRowExpansion(row, false)
                this.$nextTick(() => {
                  tableContext.toggleRowExpansion(row, true)
                })
              }

              draggableContext.$emit("change", tableContext.data)
            }
          })
          this.movingExpandedRows = null

          // 原生事件通知
          this.$emit('end', evt)
        },
      });
    },
    destroy() {
      if (this._sortable) {
        this._sortable.destroy()
        this._sortable = null
        
        /** @type {WeakMap} */
        const context = window.__ElTableDraggableContext
        if (context.has(this.table)) {
          context.delete(this.table)
        }
        this.table = null
        this.movingExpandedRows = null
      }
    },
  },
  watch: {
    $attrs: {
      deep: true,
      handler(options) {
        if (this._sortable) {
          // 排除事件，目前sortable没有on开头的属性
          const keys = Object.keys(options).filter(key => key.indexOf("on") !== 0)
          keys.forEach(key => {
            this._sortable.option(key, options[key])
          })
        }
      }
    }
  },
  mounted() {
    if (!window.__ElTableDraggableContext) {
      window.__ElTableDraggableContext = new WeakMap()
    }
    this.init();
  },
  beforeDestroy() {
    this.destroy()
  },
};
</script>
