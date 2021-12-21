<template>
  <pre class="code">{{ displayed }}</pre>
</template>

<script>
export default {
    props: {
        value: {
            type:Array,
            required: true
        }
    },
    computed: {
        displayed({ value }) {
            return JSON.stringify(value, null, 2)
        }
    }
}
</script>
<style scoped>
.code {
  overflow: auto;
  width: 100%;
  max-height: 300px;
  background: #eaeaea;
  box-sizing: border-box;
  padding: 8px;
}
</style>