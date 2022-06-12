<template>
  <component :is="tag" ref="wrapper">
    <slot></slot>
  </component>
</template>

<script>
/* eslint-disable no-unused-vars */
import { Sortable } from "sortablejs";
import getUa from "../utils/ua";
import { CONFIG, DOM_MAPPING_NAME } from "../utils/options/index";

export default {
  name: "ElementUiElTableDraggable",
  props: {
    tag: {
      type: String,
      default: "div",
    },
    column: {
      type: Boolean,
      default: false,
    },
    value: {
      type: Array,
    },
    animation: {
      type: Number,
      default: 300,
    },
    multiDrag: {
      type: Boolean,
      default: false,
    },
    onMove: {
      type: Function,
    },
  },
  data() {
    return {
      // eslint-disable-next-line vue/no-reserved-keys
      _sortable: null,
      table: null,
    };
  },
  methods: {
    init() {
      const context = window.__ElTableDraggableContext;
      if (!this.$children[0] && !this.$children[0].$el) {
        throw new Error("添加slot");
      }

      this.destroy();
      const ua = getUa();

      const { WRAPPER, DRAGGABLE, OPTION } =
        CONFIG[this.column ? "COLUMN" : "ROW"];

      this.table = this.$children[0].$el.querySelector(WRAPPER);

      const elTableContext = this.$children[0];
      context.set(this.table, elTableContext);
      const vm = this;
      const { animation } = this;

      // 根据不同种类自动注册的option
      const sortableOptions = OPTION(context, elTableContext, animation);

      this._sortable = Sortable.create(this.table, {
        delay: ua.isPc ? 0 : 300,
        // 绑定sortable的option
        animation,
        ...vm.$attrs,
        draggable: DRAGGABLE,
        // 绑定那些监听了的事件
        ...Object.keys(vm.$listeners).reduce((events, key) => {
          const handler = vm.$listeners[key];
          // 首字母大写
          const eventName = `on${key.replace(
            /\b(\w)(\w*)/g,
            function ($0, $1, $2) {
              return $1.toUpperCase() + $2.toLowerCase();
            }
          )}`;

          events[eventName] = (...args) => handler(...args);

          return events;
        }, {}),
        // 绑定生成的那些options
        ...Object.keys(sortableOptions).reduce((options, event) => {
          const eventHandler = sortableOptions[event];
          options[event] = function (...args) {
            if (event !== "onMove") {
              vm.$emit(event, ...args);
            }
            return eventHandler(...args);
          };
          return options;
        }, {}),
      });
    },
    destroy() {
      if (this._sortable) {
        /**
         * 销毁sortable
         */
        this._sortable.destroy();
        this._sortable = null;

        /**
         * 销毁映射表和对应监听器
         */
        const domMapping = this.table[DOM_MAPPING_NAME];
        if (domMapping) {
          domMapping.stop();
          domMapping.mapping.clear();
          delete this.table[DOM_MAPPING_NAME];
        }

        /**
         * 销毁表格
         */
        /** @type {WeakMap} */
        const context = window.__ElTableDraggableContext;
        if (context.has(this.table)) {
          context.delete(this.table);
        }
        this.table = null;
      }
    },
  },
  watch: {
    $attrs: {
      deep: true,
      handler(options) {
        if (this._sortable) {
          // 排除事件，目前sortable没有on开头的属性
          const keys = Object.keys(options).filter(
            (key) => key.indexOf("on") !== 0
          );
          keys.forEach((key) => {
            this._sortable.option(key, options[key]);
          });
        }
      },
    },
    column() {
      this.init();
    },
  },
  mounted() {
    if (!window.__ElTableDraggableContext) {
      window.__ElTableDraggableContext = new Map();
    }
    this.init();
  },
  beforeDestroy() {
    this.destroy();
  },
};
</script>
<style>
.draggable-dominfo-placeholder {
  height: 10px;
  display: block;
  overflow: hidden;
  background: #000 !important;
  width: 100%;
  position: absolute;
  left: 0;
  z-index: 1;
}

.draggable-dominfo-placeholder:hover {
  background: #409EFF !important;
}

.el-table-draggable__empty-table {
  min-height: 60px;
}

.el-table-draggable__empty-table table {
  width: 100%;
  height: 100%;
  min-height: 60px;
  position: absolute;
  z-index: 99;
}

.el-table-draggable__empty-table tbody {
  position: absolute;
  width: 100%;
  min-height: 100%;
}
</style>
