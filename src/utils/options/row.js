/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
import { DOM_MAPPING_NAME } from './constant'
import {
  // fixDomInfoByDirection,
  MappingOberver,
  getOnMove,
  exchange,
  updateElTableInstance,
  checkIsTreeTable,
  addTreePlaceholderRows
} from "@/utils/utils";
import dom, {
  cleanUp,
  EMPTY_FIX_CSS,
} from "@/utils/dom";

export const WRAPPER = '.el-table__body-wrapper tbody'
export const DRAGGABLE = '.el-table__row'

export const config = {
  WRAPPER,
  DRAGGABLE,
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
      WRAPPER,
    );

    elTableInstance[DOM_MAPPING_NAME] = mappingOberver;
    mappingOberver.rebuild();
    mappingOberver.start();
    let dommappingTimer = null
    let isTreeTable = checkIsTreeTable(elTableInstance) // 防止因为数据原因变化，所以每次选择都判断一次

    return {
      onChoose() {
        isTreeTable = checkIsTreeTable(elTableInstance)
        cleanUp()
        /**
         * 开始之前对所有表格做一定处理
         */
        for (const draggableTable of context.values()) {
          const domMapping = draggableTable[DOM_MAPPING_NAME];
          // 暂停dom监听，防止拖拽变化不停触发
          if (domMapping) {
            domMapping.stop();
          }

          if (isTreeTable) {
            addTreePlaceholderRows(
              domMapping.mapping,
              elTableInstance.treeProps,
              DRAGGABLE.replace('.', ''))
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
      },
      onStart(evt) {
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
         * 树状表格的特殊处理，如果碰到的dom不是placeholder，则无视
         */
        if (isTreeTable) {
          if (relatedDomInfo.type !== 'placeholder') {
            return false
          }
        }

        /**
         * 判断是否需要修正当前dragged的对应level
         */
        // let targrtDomInfo = fixDomInfoByDirection(
        //   relatedDomInfo,
        //   draggedDomInfo,
        //   willInsertAfter
        // );
        let targrtDomInfo = relatedDomInfo

        const onMove = getOnMove(elTableInstance);
        if (onMove) {
          const onMoveResutl = onMove(evt, originEvt, {
            dragged: draggedDomInfo,
            related: targrtDomInfo,
          });

          /**
           * @todo 兼容willInserAfter属性
           */
          switch (onMoveResutl) {
            case 1: {
              if (!willInsertAfter) {
                targrtDomInfo = relatedDomInfo
                // fixDomInfoByDirection(
                //   relatedDomInfo,
                //   draggedDomInfo,
                //   true
                // );
              }
              break;
            }
            case -1: {
              if (willInsertAfter) {
                targrtDomInfo = relatedDomInfo
                // fixDomInfoByDirection(
                //   relatedDomInfo,
                //   draggedDomInfo,
                //   false
                // );
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
          /** @type {import('types/DomInfo').DomInfo} */
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
        const toDomInfo =
          toDomInfoList.find((domInfo) => domInfo.elIndex === newIndex) ||
          toContext[DOM_MAPPING_NAME].mapping.get(to);
        // const toDomInfo = {
        //   ...fixDomInfoByDirection(
        //     originToDomInfo,
        //     fromDomInfo,
        //     from === to ? newIndex > oldIndex : false
        //   ),
        // };

        // 跨表格index修正
        if (
          from !== to &&
          to.querySelectorAll(DRAGGABLE).length <= 2
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

        cleanUp()
      },
      onUnchoose() {
        cleanUp()
        /**
         * 全局重新开始监听dom变化
         * 需要在之前dom操作完成之后进行
         */
        if (dommappingTimer) {
          clearTimeout(dommappingTimer)
        }
        dommappingTimer = setTimeout(() => {
          for (const draggableTable of context.values()) {
            const domMapping = draggableTable[DOM_MAPPING_NAME];
            if (domMapping) {
              domMapping.rebuild();
              domMapping.start();
            }
          }
        }, 100);
      },
    };
  },
}

export default config