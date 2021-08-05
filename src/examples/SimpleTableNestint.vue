<template>
  <div>
    <ElTableDraggable group="singleTable" v-on="$listeners">
      <el-table :data="list" row-key="id" default-expand-all>
        <el-table-column label type="expand">
          <template slot-scope="{row}">
            <ElTableDraggable group="singleTableExpanded" v-on="$listeners">
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
export const name = "单表格有展开行"
export const nameEn = 'Single Table with expanded'
import { createData, columns } from '../utils/createTable'
export default {
  data() {
    return {
      columns,
      list: createData(2).map((item, index) => ({
        ...item,
        subList: createData(2).map(item => ({
          ...item,
          index: `${index}-${item.index}`
        }))
      })),
      code: `
<!-- 列表 -->            
<ElTableDraggable group="group0">
  <el-table>
    <el-table-column type="expand">
      <ElTableDraggable group="group1">
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