<template>
  <component
    :is="tag"
    ref="wrapper"
  >
    <slot></slot>
  </component>
</template>

<script>
import Sortable from "sortablejs";

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
      table: null
    }
  },
  methods: {
    init() {
      const context = window.__ElTableDraggableContext
      if (!this.$children[0].$el) {
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
        filter: ".el-table__empty-block",
        ...this.$attrs,
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
        onEnd: (evt) => {
          const { newIndex, oldIndex, to, from, pullMode } = evt
          const toList = context.get(to).data
          const fromList = context.get(from).data
          const target = fromList[oldIndex]

          // move的情况
          if (pullMode !== 'clone') {
            fromList.splice(oldIndex, 1)
          }

          toList.splice(newIndex, 0, target)

          // change事件
          const notifyList = from === to ? [from] : [from, to]
          notifyList.forEach(table => {
            if (context.has(table)) {
              const tableContext = context.get(table)
              const draggableContext = tableContext.$parent
              draggableContext.$emit("change", tableContext.data)
            }
          })

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
