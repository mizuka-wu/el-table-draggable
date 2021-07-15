<template>
  <div id="app">
    <h1>Demo</h1>
    <div :key="key" v-for="({ key, name }) of examples">
      <h2>{{ name }}</h2>
      <component :is="key" />
      <el-link
        style="margin: 16px 0;"
        type="primary"
        :href="`https://github.com/mizuka-wu/el-table-draggable/blob/master/src/examples/${key}.vue`"
      >
        查看源文件
        <i class="el-icon-view el-icon--right"></i>
      </el-link>
      <hr />
    </div>
  </div>
</template>

<script>
const components = {}
const componentNameMap = {}
const examples = require.context('./examples', false, /\.vue$/)

examples.keys().forEach(key => {
    const componentName = key.replace('./', '').replace('.vue', '')
    const context = examples(key)

    components[componentName] = context.default
    componentNameMap[componentName] = context.name
})

export default {
  name: 'App',
  components,
  data() {
    return {
      examples: Object.keys(components).map((key) => ({
        key,
        name: componentNameMap[key]
      }))
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
  max-width: 1080px;
  padding: 8px;
  margin: auto;
}
</style>
