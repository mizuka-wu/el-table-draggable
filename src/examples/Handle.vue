<template>
  <div>
    <ElTableDraggable handle=".el-icon-rank" v-on="$listeners">
      <el-table :data="list" row-key="id" border>
        <el-table-column width="30">
          <i class="el-icon-rank" />
        </el-table-column>
        <el-table-column :key="column.key" :label="column.key" :prop="column.key" v-for="column of columns">
        </el-table-column>
      </el-table>
    </ElTableDraggable>
    <ListViewer :value="list" />
    <CodeViewer :code="code" language="html"></CodeViewer>
  </div>
</template>

<script>
export const name = "Handle可拖拽"
export const nameEn = 'Handle'
import { createData, columns } from '../utils/createTable'
export default {
  data() {
    return {
      columns,
      list: createData(),
      code: `<ElTableDraggable handle=".el-icon-rank">
    <el-table row-key="必填" :data="list">
      <el-table-column>
        <i class="el-icon-rank" />
      </el-table-column>
    </el-table>
</ElTableDraggable>`
    }
  }
}
</script>