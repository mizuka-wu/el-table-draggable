<template>
  <div id="app">
    <h1>Demo</h1>
    <el-tabs v-model="demo">
      <el-tab-pane
        :key="key"
        :label="name"
        :name="key"
        lazy
        v-for="{ key, name } of examples"
      >
        <div>
          <h2>{{ name }}</h2>
          <component :is="key" />
          <el-button
            :href="`https://github.com/mizuka-wu/el-table-draggable/blob/master/src/examples/${key}.vue`"
            style="margin: 16px 0"
            type="primary"
          >
            查看源文件
            <i class="el-icon-view el-icon--right"></i>
          </el-button>
          <hr />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
  const components = {};
  const componentNameMap = {};
  // eslint-disable-next-line no-undef
  const examples = require.context("./examples", false, /\.vue$/);

  examples.keys().forEach((key) => {
    const componentName = key.replace("./", "").replace(".vue", "");
    const context = examples(key);

    components[componentName] = context.default;
    componentNameMap[componentName] = `${context.name}(${context.nameEn})`;
  });

  export default {
    name: "App",
    components,
    data() {
      const examples = Object.keys(components).map((key) => ({
        key,
        name: componentNameMap[key],
      }));
      return {
        examples,
      };
    },
    computed: {
      demo: {
        set(demo) {
          const currentDemo = this.$route.query.demo;
          if (demo !== currentDemo) {
            this.$router.replace({
              query: {
                demo,
              },
            });
          }
        },
        get() {
          return this.$route.query.demo || this.examples[0].key;
        },
      },
    },
    methods: {
      onChoose(e) {
        console.log(e);
      },
      change(e) {
        console.log(e);
      },
    },
  };
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
