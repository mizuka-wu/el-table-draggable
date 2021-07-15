<template>
  <div>
    <ElTableDraggable>
      <el-table row-key="id" :data="list">
        <el-table-column
          :label="column.key"
          :key="column.key"
          :prop="column.key"
          v-for="column of columns"
        ></el-table-column>
      </el-table>
    </ElTableDraggable>
  </div>
</template>

<script>
export const name = "简单列表拖拽"
import { createData, columns } from '../utils/createTable'
export default {
    data() {
        return {
            columns,
            list: createData()
        }
    }
}
</script>

<style>
</style>