<template>
  <div>
    <ElTableDraggable group="multiTableNestingMix" v-on="$listeners">
      <el-table :data="list" row-key="id">
        <el-table-column label type="expand">
          <template slot-scope="{row}">
            <ElTableDraggable group="multiTableNestingMix" v-on="$listeners">
              <el-table :data="row.subList" row-key="id">
                <el-table-column
                  :key="column.key"
                  :label="column.key"
                  :prop="column.key"
                  v-for="column of columns"
                ></el-table-column>
              </el-table>
            </ElTableDraggable>
          </template>
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
    <CodeViewer :code="code" lang="html" />
  </div>
</template>

<script>
export const name = "表格嵌套"
export const nameEn = 'Table Nestint'
import { createData, columns } from '../utils/createTable'
export default {
  data() {
    return {
      columns,
      list: createData(2).map(item => ({
        ...item,
        subList: createData(2)
      })),
      code: `
<!-- 列表 -->            
<ElTableDraggable group="group">
  <el-table>
    <el-table-column type="expand">
      <ElTableDraggable group="group">
        <el-table>
        </el-table>
      </ElTableDraggable>
    </el-table-column>
  </el-table>
</ElTableDraggable>
            `
    }
  }
}
</script>