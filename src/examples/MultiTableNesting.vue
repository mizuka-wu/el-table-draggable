<template>
  <div>
    <el-row :gutter="20">
      <el-col
        :key="index"
        :span="24/lists.length"
        v-for="(list, index) of lists"
      >
        <ElTableDraggable group="multiTable">
          <el-table
            :data="list"
            row-key="id"
          >
            <el-table-column
              label
              type="expand"
            >
              <template slot-scope="{row}">{{ row }}</template>
            </el-table-column>
            <el-table-column
              :key="column.key"
              :label="column.key"
              :prop="column.key"
              v-for="column of columns"
            ></el-table-column>
          </el-table>
        </ElTableDraggable>
        <ListViewer :value="list" />
      </el-col>
    </el-row>
    <CodeViewer
      :code="code"
      lang="html"
    />
  </div>
</template>

<script>
export const name = "表格嵌套"
import { createData, columns } from '../utils/createTable'
export default {
    data() {
        return {
            columns,
            lists: [...Array.from(new Array(2)).map((key, index) => createData(index + 4))],
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