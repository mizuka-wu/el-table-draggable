<template>
  <div>
    <el-row :gutter="20">
      <el-col :key="index" :span="24 / lists.length" v-for="(list, index) of lists">
        <ElTableDraggable :group="{ name: 'cloneMultiTable', pull: 'clone' }" v-on="$listeners">
          <el-table :data="list" row-key="id">
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
    <CodeViewer :code="code" lang="html" />
  </div>
</template>

<script>
export const name = "克隆"
export const nameEn = 'Clone'
import { createData, columns } from '../utils/createTable'
export default {
  data() {
    return {
      columns,
      lists: Array.from(new Array(2)).map((key, index) => createData(index + 2)),
      code: `
<!-- 列表 -->            
<ElTableDraggable :group="{name: 'cloneMultiTable', pull: 'clone'}">
  <el-table>
  </el-table>
</ElTableDraggable>

<!-- 另一个 -->
<ElTableDraggable :group="{name: 'cloneMultiTable', pull: 'clone'}">
  <el-table>
  </el-table>
</ElTableDraggable>            
            `
    }
  }
}
</script>