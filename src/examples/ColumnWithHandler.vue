<template>
  <div>
    <ElTableDraggable v-on="$listeners" column v-model="columns" handle=".handler">
      <el-table border :data="list" row-key="id">
        <el-table-column :key="column.key" :label="column.key" :prop="column.key" :width="column.width"
          :column-key="column.key" v-for="column of columns">
          <template #header="{ column }">
            <div style="display: inline-block;width: 10px;height: 10px;background: #000;cursor: pointer;"
              class="handler">
            </div>
            <div style="select">
              {{ column.label }}
            </div>
          </template>
        </el-table-column>
      </el-table>
    </ElTableDraggable>
    <ListViewer :value="columns" />
    <CodeViewer :code="code" language="html"></CodeViewer>
  </div>
</template>

<script>
export const name = "列拖拽with handler";
export const nameEn = "Drag Column with handler";
import { createData, columns } from "../utils/createTable";
export default {
  data() {
    return {
      columns,
      list: createData(),
      code: `<ElTableDraggable column handle="handler">
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
