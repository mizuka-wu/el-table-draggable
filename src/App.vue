<template>
  <div id="app">
    <h1>表1</h1>
    <ElTableDraggable group="table">
      <el-table row-key="a" :data="data">
        <el-table-column :key="key" :prop="key" :label="key" v-for="key of keys" />
      </el-table>
    </ElTableDraggable>
    <h1>表1</h1>
    <ElTableDraggable group="table">
      <el-table row-key="a" :data="data">
        <el-table-column :key="key" :prop="key" :label="key" v-for="key of keys" />
      </el-table>
    </ElTableDraggable>
  </div>
</template>

<script>
import ElTableDraggable from './components/ElTableDraggable.vue'

export default {
  name: 'App',
  components: {
    ElTableDraggable
  },
  data() {
    return {
      keys: ["a", "b", "c", "d"],
      data: Array.from(new Array(5)).map((key, index) => ({
        a: index,
        b: index,
        c: index,
        d: index
      })),
      data2: Array.from(new Array(5)).map((key, index) => ({
        a: index,
        b: index,
        c: index,
        d: index
      }))
    }
  }
}
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}
</style>
