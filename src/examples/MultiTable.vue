<template>
  <div>
    <el-row :gutter="20">
      <el-col :key="index" :span="24/lists.length" v-for="(list, index) of lists">
        <ElTableDraggable group="multiTable">
          <el-table row-key="id" :data="list">
            <el-table-column
              :label="column.key"
              :key="column.key"
              :prop="column.key"
              v-for="column of columns"
            ></el-table-column>
          </el-table>
        </ElTableDraggable>
        <ListViewer :value="list" />
      </el-col>
    </el-row>
    <CodeViewer lang="html" :code="code" />
  </div>
</template>

<script>
export const name = "多表格相互拖拽"
import { createData, columns } from '../utils/createTable'
export default {
    data() {
        return {
            columns,
            lists: Array.from(new Array(2)).map((key, index) => createData(index + 2)),
            code: `
<!-- 列表 -->            
<ElTableDraggable group="multiTable">
  <el-table>
  </el-table>
</ElTableDraggable>

<!-- 另一个 -->
<ElTableDraggable group="multiTable">
  <el-table>
  </el-table>
</ElTableDraggable>            
            `
        }
    }
}
</script>