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
  methods: {
    makeTableSortAble() {
      if (!this.$children[0].$el) {
        throw new Error("添加slot")
      }
      const table = this.$children[0].$el.querySelector(
        ".el-table__body-wrapper tbody"
      );
      Sortable.create(table, {
        ...this.$attrs,
        onStart: () => {
          this.$emit("drag");
        },
        onEnd: ({ newIndex, oldIndex }) => {
          const arr = this.$children[0].data;
          const targetRow = arr.splice(oldIndex, 1)[0];
          arr.splice(newIndex, 0, targetRow);
          this.$emit("drop", { targetObject: targetRow, list: arr });
        }
      });
    },
  },
  mounted() {
    this.makeTableSortAble();
  },
};
</script>
