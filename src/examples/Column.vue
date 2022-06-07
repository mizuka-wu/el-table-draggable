<template>
  <div>
    <ElTableDraggable v-on="$listeners" column v-model="columns">
      <el-table border :data="list" row-key="id">
        <el-table-column
          :key="column.key"
          :label="column.key"
          :prop="column.key"
          :width="column.width"
          :column-key="column.key"
          v-for="column of columns"
        ></el-table-column>
      </el-table>
    </ElTableDraggable>
    <ListViewer :value="columns" />
    <CodeViewer :code="code" language="html"></CodeViewer>
  </div>
</template>

<script>
export const name = "列拖拽";
export const nameEn = "Drag Column";
import { createData, columns } from "../utils/createTable";
export default {
  data() {
    return {
      columns,
      list: createData(),
      code: `<ElTableDraggable column>
    <el-table :data="list">
       <el-table-column
          :key="column.key"
          :label="column.key"
          :prop="column.key"
          :width="column.width"
          :column-key="required!!!!!"
          v-for="column of columns"
        ></el-table-column>
    </el-table>
</ElTableDraggable>`,
    };
  },
};
</script>
