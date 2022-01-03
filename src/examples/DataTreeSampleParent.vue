<template>
  <div>
    <ElTableDraggable v-on="$listeners" :onMove="onMove">
      <el-table :data="list" row-key="index" default-expand-all>
        <el-table-column
          :key="column.key"
          :label="column.key"
          :prop="column.key"
          v-for="column of columns"
        ></el-table-column>
      </el-table>
    </ElTableDraggable>
    <ListViewer :value="list" />
    <CodeViewer :code="code" language="html"></CodeViewer>
  </div>
</template>

<script>
  export const name = "树状表格拖拽, 仅支持同个父级";
  export const nameEn = "Tree Table Draggable, only with same parent";
  import { createData, columns } from "../utils/createTable";
  export default {
    data() {
      return {
        columns,
        list: createData(2).map((item) => ({
          index: item.index + 1,
          children: createData(2).map((data) => ({
            index: `${item.index + 1}-${data.index + 1}`,
            children: createData(4).map((subData) => ({
              index: `${item.index + 1}-${data.index + 1}-${subData.index + 1}`,
            })),
          })),
        })),
        code: `<ElTableDraggable>
    <el-table row-key="必填" :data="list">
    </el-table>
</ElTableDraggable>`,
      };
    },
    methods: {
      onMove(evt, originEvt, { dragged, related }) {
        if (dragged.level !== 2) {
          return;
        }

        if (dragged.parent === related.parent) {
          return true;
        }

        return false;
      },
    },
  };
</script>
