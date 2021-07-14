<template>
  <div ref="wrapper">
    <slot></slot>
  </div>
</template>

<script>
import sortable from "sortablejs";
export default {
  name: "ElementUiElTableDraggable",
  props: {
    handle: {
      type: String,
      default: ""
    },
    animate: {
      type: Number,
      default: 100
    }
  },
  methods: {
    makeTableSortAble() {
      console.log(this.$attrs, this.$listeners)
      if (!this.$children[0].$el) {
        throw new Error("添加slot")
      }
      const table = this.$children[0].$el.querySelector(
        ".el-table__body-wrapper tbody"
      );
      sortable.create(table, {
        handle: this.handle,
        animation: this.animate,
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
