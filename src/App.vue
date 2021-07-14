<template>
  <div id="app">
    <ElTableDraggable></ElTableDraggable>
  </div>
</template>

<script>
import ElTableDraggable from './components/ElTableDraggable.vue'

export default {
  name: 'App',
  components: {
    ElTableDraggable
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
