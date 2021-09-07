<template>
  <component :is="tag" ref="wrapper">
    <slot></slot>
  </component>
</template>

<script>
  /* eslint-disable no-unused-vars */
  import { Sortable } from "sortablejs";
  import getUa from "../utils/ua";
  import { insertBefore, insertAfter } from "../utils/dom";

  const EMPTY_FIX_CSS = "el-table-draggable__empty-table";

  const CONFIG = {
    ROW: {
      WRAPPER: ".el-table__body-wrapper tbody",
      DRAGGABLE: ".el-table__row",
      PROP: "data",
    },
    COLUMN: {
      WRAPPER: ".el-table__header-wrapper thead tr",
      DRAGGABLE: "th",
      PROP: "columns",
    },
  };

  function getLelveFromClassName(className) {
    const level = (/--level-(\d+)/.exec(className) || [])[1];
    return +level;
  }

  /**
   * 修正index
   * 具体行为为获取当前是打开的expand的具体位置
   * 计算出每个expand容器tr的位置
   * 取最大的那个位置
   */
  function fixExpendIndex(sourceIndex, context) {
    const { expandRows } = context.store.states;
    const { data } = context;

    const indexOfExpandedRows = expandRows
      .map((row) => data.indexOf(row))
      .map((rowIndex, index) => index + rowIndex + 1); // index 之前有几个展开了， rowIndex + 1， 不算之前已经展开的话，实际应该在的位置
    const offset = indexOfExpandedRows.filter((index) => index < sourceIndex)
      .length; // 偏移量，也就是有几个expand的row小于当前row

    return sourceIndex - offset;
  }

  /**
   * 修正index和list
   * 模拟出来dom结构，看每个index对应的list和原始list
   * @todo 兼容rowKey为函数
   */
  function fixTreeIndexAndList(targetIndex, context, sourceIndex = -1) {
    const { store, data, treeProps } = context;
    const { states } = store;
    const { treeData, rowKey } = states;
    const { children } = treeProps;

    // 扁平化处理
    function flatData(list, flated = []) {
      list.forEach((item, index) => {
        flated.push({
          list,
          index,
          children: item[children],
        });
        // treeData里有它，也就是有子节点
        if (treeData[item[rowKey]]) {
          const subList = item[children];
          flatData(subList, flated);
        }
      });
      return flated;
    }

    let flatDom = flatData(data, []);

    // 因为拖拽的时候把子层级排除了，所以这里计算扁平化的时候也要排除
    if (sourceIndex > -1) {
      const target = flatDom[sourceIndex];
      if (target.children) {
        flatDom = flatDom.filter((item) => item.list !== target.children);
      }
    }

    return flatDom[targetIndex];
  }

  function exchange(oldIndex, fromList, newIndex, toList, pullMode) {
    // 核心交换
    const target = fromList[oldIndex];
    // move的情况
    if (pullMode !== "clone") {
      fromList.splice(oldIndex, 1);
    }
    toList.splice(newIndex, 0, target);
  }

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
      multiDrag: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // eslint-disable-next-line vue/no-reserved-keys
        _sortable: null,
        table: null,
        movingExpandedRows: [],
      };
    },
    computed: {
      row({ column }) {
        return !column;
      },
    },
    methods: {
      init() {
        const context = window.__ElTableDraggableContext;
        if (!this.$children[0] && !this.$children[0].$el) {
          throw new Error("添加slot");
        }

        this.destroy();
        const ua = getUa();

        const { WRAPPER, DRAGGABLE, PROP } = CONFIG[
          this.column ? "COLUMN" : "ROW"
        ];

        this.table = this.$children[0].$el.querySelector(WRAPPER);

        const elTableContext = this.$children[0];
        context.set(this.table, elTableContext);

        // if (this.multiDrag) {
        //   Sortable.mount(new MultiDrag());
        // }

        this._sortable = Sortable.create(this.table, {
          delay: ua.isPc ? 0 : 300,
          // 绑定sortable的option
          animation: 300,
          ...this.$attrs,
          draggable: DRAGGABLE,
          // 绑定事件
          ...Object.keys(this.$listeners).reduce((events, key) => {
            const handler = this.$listeners[key];
            // 首字母大写
            const eventName = `on${key.replace(/\b(\w)(\w*)/g, function(
              $0,
              $1,
              $2
            ) {
              return $1.toUpperCase() + $2.toLowerCase();
            })}`;

            events[eventName] = (...args) => handler(...args);

            return events;
          }, {}),
          /**
           * 展开列需要隐藏处理
           * 空列表需要修改样式
           * @param { {item: Element, from: Element, oldIndex: number} } evt
           */
          onStart: (evt) => {
            if (this.row) {
              // 修改空列表
              const tableEls = document.querySelectorAll(
                ".el-table__body-wrapper table"
              );
              tableEls.forEach((tableEl) => {
                if (tableEl.clientHeight === 0) {
                  // body-wrapper增加样式，让overflw可显示同时table有个透明区域可拖动
                  tableEl.parentNode.classList.add(EMPTY_FIX_CSS);
                }
              });

              const { item, from, oldIndex } = evt;

              // 带expanded的处理
              if (item.className.includes("expanded")) {
                const expandedTr = item.nextSibling;
                this.movingExpandedRows = [expandedTr];
              }

              // 树形展开的处理, expandedRows包含之前expanded的部分
              if (item.className.includes("--level-")) {
                const targetLevel = getLelveFromClassName(item.className);
                // 将当前index和之后index区间内的(子树)全部当作展开项处理
                const trList = Array.from(from.children);
                // 之后一个同级的，如果没有则是高一级-1
                const nextSameLevelTrIndex = trList.findIndex((tr, index) => {
                  if (index <= oldIndex) {
                    return false;
                  }
                  const level = getLelveFromClassName(tr.className);
                  return level <= targetLevel;
                });

                this.movingExpandedRows = trList.slice(
                  oldIndex + 1,
                  nextSameLevelTrIndex === -1 ? undefined : nextSameLevelTrIndex
                );
              }

              this.movingExpandedRows.forEach((tr) => {
                tr.parentNode.removeChild(tr);
              });
            }
            this.$emit("start", evt);
          },
          /**
           * 展开列需要自动调整位置
           */
          onMove: (evt, originalEvent) => {
            /**
             * 如果该列是展开列，需要调整样式
             */
            const { related, willInsertAfter, dragged } = evt;
            if (related.className.includes("expanded")) {
              // 预防万一，判断一下展开行下一行是不是真实的已展开的行(没有className)
              const expandedTr =
                related.nextSibling &&
                related.nextSibling.className === "" &&
                related.nextSibling;
              if (expandedTr) {
                const { animation } = this._sortable.options;
                this.$nextTick(() => {
                  if (willInsertAfter) {
                    insertAfter(dragged, expandedTr, animation);
                  } else {
                    insertBefore(dragged, related, animation);
                  }
                });
                return false;
              }
            }

            this.$emit("move", evt, originalEvent);
          },
          onEnd: (evt) => {
            // 移除empty的css
            Array.from(document.querySelectorAll(`.${EMPTY_FIX_CSS}`)).forEach(
              (el) => {
                el.classList.remove(EMPTY_FIX_CSS);
              }
            );

            const { to, from, pullMode } = evt;
            const toContext = context.get(to);
            let toList = toContext[PROP];
            const fromContext = context.get(from);
            let fromList = fromContext[PROP];
            let { newIndex, oldIndex, item } = evt;
            console.log(oldIndex, newIndex);

            if (this.row) {
              if (item.className.includes("--level-")) {
                /** tree模式下需要修正 */
                const fixedFrom = fixTreeIndexAndList(
                  oldIndex,
                  fromContext,
                  oldIndex
                );
                oldIndex = fixedFrom.index;
                fromList = fixedFrom.list;
                /**
                 * 如果是在同一个表格下面，需要修正to的context
                 */
                const fixedTo = fixTreeIndexAndList(
                  newIndex,
                  toContext,
                  toContext === fromContext ? oldIndex : -1
                );
                newIndex = fixedTo.index;
                toList = fixedTo.list;
              } else {
                /** expand模式下需要进行修正 */
                oldIndex = fixExpendIndex(oldIndex, fromContext);
                newIndex = fixExpendIndex(newIndex, toContext);
              }
            }
            // 交换位置
            exchange(oldIndex, fromList, newIndex, toList, pullMode);

            // 列模式将传入的value也尝试交换一下
            if (this.column) {
              const fromValue = fromContext.$parent.value || [];
              const toValue = toContext.$parent.value || [];
              if (fromValue.length && toValue.length) {
                exchange(oldIndex, fromValue, newIndex, toValue, pullMode);
              }
            }

            // change事件
            const affected = from === to ? [from] : [from, to];

            affected.forEach((table) => {
              if (context.has(table)) {
                const tableContext = context.get(table);
                const draggableContext = tableContext.$parent;

                // 修正expand，也就是将expand的部分全部重新绘制一遍
                if (this.movingExpandedRows.length) {
                  // 缓存需要展开的row
                  const rows = this.movingExpandedRows;
                  rows.forEach((row) => {
                    insertAfter(row, item);
                  });
                  this.movingExpandedRows = [];
                }
                if (this.row) {
                  const data = tableContext[PROP];
                  draggableContext.$emit("input", data);
                } else {
                  const columns = draggableContext.value
                    ? draggableContext.value
                    : tableContext[PROP].map(({ property }) => ({ property }));
                  draggableContext.$emit("input", columns);
                }
              }
            });
            this.movingExpandedRows = [];

            // 原生事件通知
            this.$emit("end", evt);
          },
        });
      },
      destroy() {
        if (this._sortable) {
          this._sortable.destroy();
          this._sortable = null;

          /** @type {WeakMap} */
          const context = window.__ElTableDraggableContext;
          if (context.has(this.table)) {
            context.delete(this.table);
          }
          this.table = null;
          this.movingExpandedRows = [];
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
      row() {
        this.init();
      },
    },
    mounted() {
      if (!window.__ElTableDraggableContext) {
        window.__ElTableDraggableContext = new WeakMap();
      }
      this.init();
    },
    beforeDestroy() {
      this.destroy();
    },
  };
</script>
<style>
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
