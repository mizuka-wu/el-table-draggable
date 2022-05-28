/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom, {
  CUSTOMER_INDENT_CSS,
  EMPTY_FIX_CSS,
  PLACEHOLDER_CSS,
} from "./dom";
import {
  fixDomInfoByDirection,
  MappingOberver,
  getOnMove,
  checkIsTreeTable,
} from "./utils";

export const DOM_MAPPING_NAME = "_mapping";

/**
 * @typedef DomInfo Dom对应的信息
 * @property {Element} el 
 * @property {number} elIndex
 * @property {number} level
 * @property {any[]} data
 * @property {number} index
 * @property {DomInfo|null} parent
 * @property {DomInfo[]} childrenList
 * @property {boolean} isShow
 * @property {'root' | 'leaf' | 'proxy' | undefined} type
 */

/**
 * Dom映射表
 * el=>对应的data数据
 * @typedef {Map<Element, DomInfo>} DomMapping
 */

/**
 * 通知收到影响的表格
 * @param {Element} from
 * @param {Element} to
 * @param {Map<Element, Vue>} context
 * @param {(tableInstance: Vue) => any} handler
 */
function updateElTableInstance(from, to, context, handler) {
  const affected = from === to ? [from] : [from, to];
  affected.forEach((table) => {
    if (context.has(table)) {
      const tableInstance = context.get(table);
      handler(tableInstance);
    }
  });
}

/**
 * 将某个元素从某个列表插入到另一个对应位置
 * @param {number} oldIndex
 * @param {any[]} fromList
 * @param {nmber} newIndex
 * @param {any[]} toList
 * @param {import('@types/sortablejs').PullResult} pullMode
 */
export function exchange(oldIndex, fromList, newIndex, toList, pullMode) {
  // 核心交换
  const target = fromList[oldIndex];
  // move的情况
  if (pullMode !== "clone") {
    fromList.splice(oldIndex, 1);
  }
  toList.splice(newIndex, 0, target);
}

/**
 * 行列的基础config
 */
export const CONFIG = {
  ROW: {
    WRAPPER: ".el-table__body-wrapper tbody",
    DRAGGABLE: ".el-table__row",
    /**
     * @param {Map<Element, Vue>} context
     * @param {Vue} elTableInstance
     * @param {number} animation
     * @returns {import('@types/sortablejs').SortableOptions}
     */
    OPTION(context, elTableInstance, animation) {
      const PROP = 'data'
      /**
       * 自动监听重建映射表
       */
      if (elTableInstance[DOM_MAPPING_NAME]) {
        elTableInstance[DOM_MAPPING_NAME].stop();
      }
      const mappingOberver = new MappingOberver(
        elTableInstance,
        CONFIG.ROW.WRAPPER
      );
      elTableInstance[DOM_MAPPING_NAME] = mappingOberver;
      mappingOberver.rebuild();
      mappingOberver.start();

      return {
        onStart(evt) {
          /**
           * 开始之前对所有表格做一定处理
           */
          for (const draggableTable of context.values()) {
            // const isTreeTable = checkIsTreeTable(draggableTable);
            const domMapping = draggableTable[DOM_MAPPING_NAME];
            // 暂停dom监听，防止拖拽变化不停触发
            if (domMapping) {
              domMapping.stop();
            }

            /**
             * 解决手动关闭后会有的错位问题
             * 导致原因，default-expanded-all
             * 需要记录一下当前打开的行，结束之后还原状态（待定）
             */
            draggableTable.store.states.defaultExpandAll = false;

            // 如果是空表格，增加一个css
            const tableEl = draggableTable.$el.querySelector(
              ".el-table__body-wrapper table"
            );
            if (tableEl.clientHeight === 0) {
              // body-wrapper增加样式，让overflw可显示同时table有个透明区域可拖动
              tableEl.parentNode.classList.add(EMPTY_FIX_CSS);
            }
          }

          /**
           * expanded/树表格的处理, 关闭展开行
           */
          const { item } = evt;
          const domInfo = mappingOberver.mapping.get(item);
          // 收起拖动的行的已展开行
          dom.toggleExpansion(domInfo, false);
        },
        onMove(evt, originEvt) {
          const { related, dragged, to, from, willInsertAfter } = evt;
          const fromContext = context.get(from);
          const toContext = context.get(to);
          /** @type {DomInfo} */
          const draggedDomInfo =
            fromContext[DOM_MAPPING_NAME].mapping.get(dragged);
          /** @type {DomInfo} */
          const relatedDomInfo =
            toContext[DOM_MAPPING_NAME].mapping.get(related);

          /**
           * 判断是否需要修正当前dragged的对应level
           */
          let targrtDomInfo = fixDomInfoByDirection(
            relatedDomInfo,
            draggedDomInfo,
            willInsertAfter
          );

          const onMove = getOnMove(elTableInstance);
          if (onMove) {
            const onMoveResutl = onMove(evt, originEvt, {
              dragged: draggedDomInfo,
              related: targrtDomInfo,
            });

            switch (onMoveResutl) {
              case 1: {
                if (!willInsertAfter) {
                  targrtDomInfo = fixDomInfoByDirection(
                    relatedDomInfo,
                    draggedDomInfo,
                    true
                  );
                }
                break;
              }
              case -1: {
                if (willInsertAfter) {
                  targrtDomInfo = fixDomInfoByDirection(
                    relatedDomInfo,
                    draggedDomInfo,
                    false
                  );
                }
                break;
              }
              case false: {
                return false;
              }
              default: {
                break;
              }
            }
          }

          /**
           * relatedDomInfo，自动将children插入到自身后方
           * @todo 需要增加动画效果，目标直接插入，需要在下一循环，位置变化好后再配置
           */
          setTimeout(() => {
            relatedDomInfo.childrenList.forEach((children) => {
              // expanded或者是影子行
              if (children.type === "proxy") {
                dom.insertAfter(children.el, relatedDomInfo.el);
              }
            });
          });

          const {
            states: { indent },
          } = fromContext.store;
          dom.changeDomInfoLevel(draggedDomInfo, targrtDomInfo.level, indent);
        },
        onEnd(evt) {
          dom.cleanUp();

          const { to, from, pullMode, newIndex, item, oldIndex } = evt;
          const fromContext = context.get(from);
          const toContext = context.get(to);

          /** @type {DomInfo} */
          const fromDomInfo = fromContext[DOM_MAPPING_NAME].mapping.get(item);
          /**
           * @type {DomInfo[]}
           * 之前目标位置的dom元素, 因为dom已经换了，所以需要通过elIndex的方式重新找回来
           */
          const toDomInfoList = Array.from(
            toContext[DOM_MAPPING_NAME].mapping.values()
          );
          const originToDomInfo =
            toDomInfoList.find((domInfo) => domInfo.elIndex === newIndex) ||
            toContext[DOM_MAPPING_NAME].mapping.get(to);
          const toDomInfo = {
            ...fixDomInfoByDirection(
              originToDomInfo,
              fromDomInfo,
              from === to ? newIndex > oldIndex : false
            ),
          };

          // 跨表格index修正
          if (
            from !== to &&
            to.querySelectorAll(CONFIG.ROW.DRAGGABLE).length <= 2
          ) {
            toDomInfo.index = newIndex;
          }

          /**
           * 数据层面的交换
           */
          // mapping层面的交换
          exchange(
            fromDomInfo.index,
            fromDomInfo.parent.childrenList,
            toDomInfo.index,
            toDomInfo.type === "root"
              ? toDomInfo.childrenList
              : toDomInfo.parent.childrenList,
            pullMode
          );

          // 数据层面的交换
          exchange(
            fromDomInfo.index,
            fromDomInfo.data,
            toDomInfo.index,
            toDomInfo.data,
            pullMode
          );

          // clone对象的话，需要从dom层面删除，防止el-table重复渲染
          if (pullMode === 'clone' && from !== to) {
            to.removeChild(fromDomInfo.el)
          }

          // 通知更新
          updateElTableInstance(from, to, context, function (tableContext) {
            const draggableContext = tableContext.$parent; // 包裹组件
            const data = tableContext[PROP];
            draggableContext.$emit("input", data);
          });

          /**
           * dom修正，因为exchange之后el-table可能会错乱，所以需要修正位置
           * 将原始的dom信息带回来children带回来
           * 删除一些临时加进去的行
           */
          // 根据mapping自动重新绘制, 最高一层就不用rebuild了
          if (toDomInfo.parent && toDomInfo.parent.parent) {
            dom.toggleExpansion(toDomInfo.parent, true);
          }
          // expanded部分
          dom.toggleExpansion(fromDomInfo, true);
          /** @todo 缓存是否强制expanded */
          toContext.toggleRowExpansion(fromDomInfo.data, true);

          //移除手动生成的位移
          document.querySelectorAll(`.${CUSTOMER_INDENT_CSS}`).forEach((el) => {
            dom.remove(el);
          });

          // // 移除占位的行
          // document
          //   .querySelectorAll(`.${PLACEHOLDER_CSS}`)
          //   .forEach((placeholderEl) => {
          //     dom.remove(placeholderEl);
          // });

          /**
           * 全局重新开始监听dom变化
           * 需要在之前dom操作完成之后进行
           */
          setTimeout(() => {
            for (const draggableTable of context.values()) {
              const domMapping = draggableTable[DOM_MAPPING_NAME];
              if (domMapping) {
                domMapping.rebuild();
                domMapping.start();
              }
            }
          }, 1000);
        },
      };
    },
  },
  COLUMN: {
    WRAPPER: ".el-table__header-wrapper thead tr",
    DRAGGABLE: "th",
    /**
     * @param {Map<Element, Vue>} context
     * @param {Vue} elTableInstance
     * @param {number} animation
     * @returns {import('@types/sortablejs').SortableOptions}
     */
    OPTION(context, elTableInstance, animation) {
      let isDragging = false // 正在拖拽
      let columnIsMoving = false // 列正在移动
      // 自动对齐
      function autoAlignmentTableByThList(thList) {
        if (!isDragging) {
          return
        }
        dom.alignmentTableByThList(thList)
        return requestAnimationFrame(() => {
          autoAlignmentTableByThList(thList)
        })
      }

      /** 列宽的虚拟dom */
      let colDomInfoList = []

      return {
        onStart() {
          const thList = Array.from(elTableInstance.$el.querySelector(CONFIG.COLUMN.WRAPPER).childNodes)

          colDomInfoList = thList.map(th => {
            const col = dom.getColByTh(th)
            const width = col ? col.getAttribute('width') : th.offsetWidth
            return {
              el: col,
              thEl: th,
              width: width,
              originWidth: width
            }
          })

          // dragging状态自动调用对齐
          isDragging = true
          autoAlignmentTableByThList(thList)
        },
        setData(dataTransfer, dragEl) {
          /**
           * 在页面上创建一个当前table的wrapper，然后隐藏它，只显示那一列的部分作为拖拽对象
           * 在下一个事件循环删除dom即可
           */
          const { offsetLeft, offsetWidth, offsetHeight } = dragEl;
          const tableEl = elTableInstance.$el;

          const wrapper = document.createElement("div"); // 可视区域
          wrapper.style = `position: fixed; z-index: -1;overflow: hidden; width: ${offsetWidth}px`;
          const tableCloneWrapper = document.createElement("div"); // table容器，宽度和位移
          tableCloneWrapper.style = `position: relative; left: -${offsetLeft}px; width: ${tableEl.offsetWidth}px`;
          wrapper.appendChild(tableCloneWrapper);
          tableCloneWrapper.appendChild(tableEl.cloneNode(true));

          // 推进dom，让dataTransfer可以获取
          document.body.appendChild(wrapper);
          // 拖拽位置需要偏移到对应的列上
          dataTransfer.setDragImage(
            wrapper,
            offsetLeft + offsetWidth / 2,
            offsetHeight / 2
          );
          setTimeout(() => {
            document.body.removeChild(wrapper);
          });
        },
        onMove(evt, originEvent) {
          const { related, dragged, relatedRect, draggedRect } = evt;
          let { willInsertAfter } = evt;

          // 根据用户选择
          const onMove = getOnMove(elTableInstance);
          const onMoveResult = onMove(evt, originEvent)
          switch (onMoveResult) {
            case 1: {
              willInsertAfter = true;
              break;
            }
            case -1: {
              willInsertAfter = false;
              break;
            }
            case false: {
              return false;
            }
            default: {
              break;
            }
          }

          /**
           * 对dom进行操作
           */
          const thList = willInsertAfter ? [dragged, related] : [related, dragged];
          // 临时修改两个的宽度, 需要在下个循环触发，省的宽度不一致导致因为dom变化再次触发拖拽
          const colList = thList
            .map(th => colDomInfoList.find(item => item.thEl === th))
          // 交换宽度
          if (colList.length !== 2) {
            throw new Error('无法找到拖拽的th的信息，请检查是否跨表格拖拽了')
            return true
          }
          const [fromCol, toCol] = colList
          setTimeout(() => {
            dom.swapDom(fromCol.el, toCol.el)
            // 交换colDomInfoList内位置
            const oldIndex = colDomInfoList.indexOf(fromCol)
            const newIndex = colDomInfoList.indexOf(toCol)
            exchange(oldIndex, colDomInfoList, newIndex, colDomInfoList)
          })

          return true;
        },
        onEnd(evt) {
          const PROP = "columns";
          dom.cleanUp();
          // 清除所有临时交换产生的设定和变量
          colDomInfoList.forEach(({ el, originWidth }) => {
            el.setAttribute('width', originWidth)
          })

          isDragging = false

          const { to, from, pullMode } = evt;
          const toContext = context.get(to);
          let toList = toContext[PROP];
          const fromContext = context.get(from);
          let fromList = fromContext[PROP];
          let { newIndex, oldIndex } = evt;

          // 交换dom位置
          exchange(oldIndex, fromList, newIndex, toList, pullMode);

          // 交换传递下来的column的value
          const fromValue = fromContext.$parent.value || [];
          const toValue = toContext.$parent.value || [];
          if (fromValue.length && toValue.length) {
            exchange(oldIndex, fromValue, newIndex, toValue, pullMode);
          }

          // 通知对应的实例
          updateElTableInstance(from, to, context, function (tableContext) {
            const draggableContext = tableContext.$parent;
            const columns = draggableContext.value
              ? draggableContext.value
              : tableContext[PROP].map(({ property }) => ({ property }));
            draggableContext.$emit("input", columns);
          });

          // 将顶部的宽度顺序矫正
          if (colDomInfoList[0] && colDomInfoList[0].el) {
            /** @type {Element} */
            const colContainer = colDomInfoList[0].el.parentNode
            const html = colDomInfoList.map(item => {
              const el = `<col name="${dom.getColName(item.thEl)}" width="${item.width}">`
              return el
            }).join('\n')
            colContainer.innerHTML = html
          }
        },
      };
    },
  },
};
