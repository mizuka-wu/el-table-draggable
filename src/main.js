import Vue from 'vue'
import App from './App.vue'
import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import ElTableDraggable from './components/ElTableDraggable.vue'
import ListViewer from "./components/ListViewer.vue"

Vue.use(Element)
Vue.component("ListViewer", ListViewer)
Vue.component("ElTableDraggable", ElTableDraggable)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
