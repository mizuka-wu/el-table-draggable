<template>
  <div id="app">
    <h1>Demo</h1>
    <div :key="key" v-for="({ key, name }) of examples">
      <h2>{{ name }}</h2>
      <component :is="key" />
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
  padding: 8px;
}
</style>
