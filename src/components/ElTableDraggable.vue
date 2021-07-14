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
      const table = this.$children[0].$el.querySelector(
        ".el-table__body-wrapper tbody"
      );
      this.sortable = Sortable.create(table, {
        ...this.$attrs,
        onStart: () => {
        },
        onEnd: ({ newIndex, oldIndex }) => {
          const table = this.$children[0]
          const array = table.data;
          const targetRow = array.splice(oldIndex, 1)[0];
          array.splice(newIndex, 0, targetRow);
          this.$nextTick(() => {
            console.log(window.table = table)
          })
        }
      });
    },
  },
  mounted() {
    this.init();
  },
  beforeDestroy() {
    if (this._sortable !== undefined) this._sortable.destroy();
  },
};
</script>
