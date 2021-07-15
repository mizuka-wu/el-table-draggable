<template>
  <pre style="background: #eaeaea">{{ displayed }}</pre>
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