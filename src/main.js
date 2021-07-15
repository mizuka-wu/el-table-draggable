import Vue from 'vue'
import App from './App.vue'
import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import ElTableDraggable from './components/ElTableDraggable.vue'
import ListViewer from "./components/ListViewer.vue"
import Highlight from 'vue-highlight-component'
import hljs from 'highlight.js'
import 'highlight.js/styles/codepen-embed.css'

hljs.registerLanguage('html', require('highlight.js/lib/languages/htmlbars'))

Vue.use(Element)
Vue.component("CodeViewer", Highlight)
Vue.component("ListViewer", ListViewer)
Vue.component("ElTableDraggable", ElTableDraggable)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
