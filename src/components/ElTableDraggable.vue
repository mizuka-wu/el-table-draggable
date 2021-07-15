<template>
  <div ref="wrapper">
    <slot></slot>
  </div>
</template>

<script>
import Sortable from "sortablejs";

export default {
  name: "ElementUiElTableDraggable",
  props: {
    value: {
      type: Array,
      default: () => []
    },
  },
  data() {
    return {
      // eslint-disable-next-line vue/no-reserved-keys
      _sortable: null
    }
  },
  methods: {
    init() {
      if (!this.$children[0].$el) {
        throw new Error("添加slot")
      }

      if (this._sortable) {
        this._sortable.destroy()
      }

      const table = this.$children[0].$el.querySelector(
        ".el-table__body-wrapper tbody"
      );

      this._sortable = Sortable.create(table, {
        // 绑定sortable的option
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
        onEnd: ({ newIndex, oldIndex }) => {
          console.log(newIndex, oldIndex)
          const table = this.$children[0]
          const array = table.data;
          const targetRow = array.splice(oldIndex, 1)[0];
          array.splice(newIndex, 0, targetRow);
        }
      });
    }
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
    this.init();
  },
  beforeDestroy() {
    if (this._sortable !== undefined) this._sortable.destroy();
  },
};
</script>
