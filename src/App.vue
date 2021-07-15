<template>
  <div id="app">
    <el-checkbox v-model="disabled">禁止拖动</el-checkbox>
    <div
      :key="index"
      v-for="(data, index) of datas"
    >
      <h1>表1</h1>
      {{ data }}
      <ElTableDraggable
        :disabled="disabled"
        group="table"
      >
        <el-table
          :data="data"
          row-key="a"
        >
          <el-table-column
            :key="key"
            :label="key"
            :prop="key"
            v-for="key of keys"
          />
        </el-table>
      </ElTableDraggable>
    </div>
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
      disabled: false,
      keys: ["a", "b", "c", "d"],
      datas: Array.from(new Array(2)).map((_key, _index) => (Array.from(new Array(5)).map((key, index) => ({
        a: index * (_index + 100),
        b: index * _index + 200,
        c: index * _index + 400,
        d: index
      }))))
    }
  },
  methods: {
    onChoose(e) {
      console.log(e)
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
  box-sizing: border-box;
}

#app {
  padding: 8px;
}
</style>
