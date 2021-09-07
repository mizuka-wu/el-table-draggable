<template>
  <div>
    <ElTableDraggable v-on="$listeners">
      <el-table
        :data="list"
        row-key="id"
      >
        <el-table-column
          :key="column.key"
          :label="column.key"
          :prop="column.key"
          v-for="column of columns"
        ></el-table-column>
      </el-table>
    </ElTableDraggable>
    <ListViewer :value="list" />
    <CodeViewer
      :code="code"
      language="html"
    ></CodeViewer>
  </div>
</template>

<script>
export const name = "树状表格拖拽"
export const nameEn = 'Tree Table Draggable'
import { createData, columns } from '../utils/createTable'
export default {
  data() {
    return {
      columns,
      list: createData(3).map((item, index) => ({
        ...item,
        children: createData(2).map(data => ({
          ...data,
          index: `${index}-${data.index}`,
        }))
      })),
      code: `<ElTableDraggable>
    <el-table row-key="必填" :data="list">
    </el-table>
</ElTableDraggable>`
    }
  }
}
</script>