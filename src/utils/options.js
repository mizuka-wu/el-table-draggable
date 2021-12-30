/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom, {
  CUSTOMER_INDENT_CSS,
  EMPTY_FIX_CSS,
  TREE_PLACEHOLDER_ROW_CSS,
} from "./dom";
import {
  getLevelFromClassName,
  getLevelRowClassName,
  checkIsTreeTable,
  fixDomInfoByDirection,
} from "./utils";

export const DOM_MAPPING_NAME = "_mapping";

/**
 * Dom映射表
 * el=>对应的data数据
 * @typedef {{ el:Element, elIndex: number, level: number, data: any[],index: number, parent: DomInfo | null, childrenList: DomInfo[], type: 'root' | 'leaf' | 'proxy' }} DomInfo
 * @typedef {Map<Element, DomInfo>} DomMapping
 */

/**
 * 获取最近一个同级的
 * @param {DomInfo} domInfo
 * @param {number} [targetLevel]
 * @returns {DomInfo | null}
 */
function getSameLevelParentDomInfo(domInfo, targetLevel = 0) {
  const { level, parent } = domInfo;

  if (level === targetLevel) {
    return domInfo;
  }

  if (!parent) {
    return null;
  }

  return getSameLevelParentDomInfo(parent, targetLevel);
}

/**
 * 根据类型当前的dom结构，自动构建每个tr的对应数据关系
 * 如果是树状表格，需要增加一个placeholder结构进去
 * @param {Vue} tableInstance ElTable实例
 * @param {Map<Element, DomInfo>} [mapping]
 * @returns {Map<Element, DomInfo>}
 */
function createOrUpdateDomMapping(tableInstance, mapping = new Map()) {
  // table的配置
  const { data, treeProps } = tableInstance;
  const { children } = treeProps;

  mapping.clear();

  /** @type {DomInfo} 最新被使用的dom, 默认是采用了整个table作为root */
  let latestDomInfo = {
    el: tableInstance.$el,
    level: -1,
    // root的data需要特殊处理，通过-1取到
    data: [],
    index: -1,
    parent: null,
    childrenList: [],
    type: "root",
  };

  const trList = tableInstance.$el.querySelectorAll(
    `${CONFIG.ROW.WRAPPER} > tr`
  );
  trList.forEach((tr, index) => {
    try {
      const { className, style } = tr;

      /** @type {DomInfo} */
      const domInfo = {
        elIndex: index,
        el: tr,
        level: 0,
        data,
        index: 0,
        parent: null,
        childrenList: [],
      };

      /**
       * expanded的容器行
       * 相当于其父容器的代理
       * 自动和最近那个操作的行绑定，因为没有明确的类名称，所以需要特殊处理
       */
      if (!className) {
        if (latestDomInfo) {
          Object.assign(domInfo, {
            ...latestDomInfo,
            el: tr,
            elIndex: index,
            type: "proxy",
          });
          latestDomInfo.childrenList.push(domInfo);
        }
        mapping.set(tr, domInfo);
        return;
      }

      // 创建dom对应的信息
      const level = getLevelFromClassName(tr.className);
      domInfo.level = level;
      /**
       * 这里需要两个步骤，如果相差一级的话，当作是parent，
       * 如果超过一级的话，需要回朔查找同级别的对象，以其为基准继续判定
       */
      const levelGap = level - latestDomInfo.level;
      switch (levelGap) {
        // 同级，继承
        case 0: {
          domInfo.index = latestDomInfo.index + 1;
          domInfo.parent = latestDomInfo.parent;
          domInfo.data = latestDomInfo.data;

          if (domInfo.parent) {
            domInfo.parent.childrenList.push(domInfo);
          }

          break;
        }
        // 之前的那个tr的下级
        case 1: {
          domInfo.parent = latestDomInfo;

          const childrenData =
            latestDomInfo.type === "root"
              ? data
              : latestDomInfo.data[latestDomInfo.index][children];
          domInfo.data = childrenData;
          domInfo.parent.childrenList.push(domInfo);
          break;
        }
        // 正常情况，朔源最新的一个同级的
        default: {
          const sameLevelDomInfo = getSameLevelParentDomInfo(
            latestDomInfo,
            level
          );
          if (!sameLevelDomInfo) {
            console.error(tr, latestDomInfo);
            throw new Error("找不到其同级dom");
          }
          domInfo.index = sameLevelDomInfo.index + 1;
          domInfo.parent = sameLevelDomInfo.parent;
          domInfo.data = sameLevelDomInfo.data;
          if (domInfo.parent) {
            domInfo.parent.childrenList.push(domInfo);
          }
          break;
        }
      }
      mapping.set(tr, domInfo);
      latestDomInfo = domInfo;
    } catch (e) {
      console.error({
        tr,
        latestDomInfo,
      });
      console.error(e);
    }
  });

  return mapping;
}

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
      const PROP = "data";

      /** @type {DomMapping} 映射表 */
      const mapping = createOrUpdateDomMapping(elTableInstance);

      /** 自动监听重建映射表 */
      if (elTableInstance[DOM_MAPPING_NAME]) {
        elTableInstance[DOM_MAPPING_NAME].stop();
      }
      const observer = new MutationObserver(() => {
        createOrUpdateDomMapping(elTableInstance, mapping);
      });
      const mappingOberver = {
        mapping,
        rebuild() {
          createOrUpdateDomMapping(elTableInstance, mapping);
        },
        start: () => {
          observer.observe(
            elTableInstance.$el.querySelector(CONFIG.ROW.WRAPPER),
            {
              childList: true,
              subtree: true,
            }
          );
        },
        stop() {
          observer.disconnect();
        },
      };
      elTableInstance[DOM_MAPPING_NAME] = mappingOberver;
      mappingOberver.start();

      window.HELL = mapping;

      return {
        onStart(evt) {
          /**
           * 开始之前对所有表格做一定处理
           */
          for (const draggableTable of context.values()) {
            // 暂停dom监听，防止拖拽变化不停触发
            draggableTable[DOM_MAPPING_NAME] &&
              draggableTable[DOM_MAPPING_NAME].stop();

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

            /**
             * 树状表的话
             * 1. 判断一下每一行是不是把indent给补上了，没有的自动增加
             * @todo
             * 2. 给每个树的行增加对应的占位
             *    在占位部分，拖到子节点，否则拖到同级
             */
            if (checkIsTreeTable(draggableTable)) {
              // 需要给每个level0的行增加一个占位
              // const itemLevel = getLevelFromClassName(evt.item.className);
              // // 从生成的mapping重新生成一个dom树，插入placeholder的，这样可以保证拖到不同的位置
              // const domList = Array.from(mapping.values())
              //   .sort((a, b) => a.elIndex - b.elIndex)
              //   .reduce((newDomList, domInfo) => {
              //     newDomList.push(domInfo);
              //     /**
              //      * 添加占位行(需要排除正在拖拽的以及其子孙)
              //      */
              //     const { level, el } = domInfo;
              //     const sameLevelParentDomInfo = getSameLevelParentDomInfo(
              //       el,
              //       itemLevel
              //     );
              //     if (
              //       sameLevelParentDomInfo &&
              //       sameLevelParentDomInfo.el === evt.item
              //     ) {
              //       return newDomList;
              //     }
              //     // 创建一个占位，用来判断是拖动到同级还是子级
              //     const placeholderEl = document.createElement("tr");
              //     placeholderEl.style.width = `${domInfo.el.offsetWidth}px`;
              //     placeholderEl.classList.add(
              //       getLevelRowClassName(level + 1),
              //       CONFIG.ROW.DRAGGABLE,
              //       TREE_PLACEHOLDER_ROW_CSS
              //     );
              //     /** @type {DomInfo} */
              //     const placeholderDomInfo = {
              //       el: placeholderEl,
              //       elIndex: 0,
              //       type: "leaf",
              //       level: level + 1,
              //       data: [],
              //       index: domInfo.childrenList.length,
              //       parent: domInfo,
              //       childrenList: [],
              //     };
              //     newDomList.push(placeholderDomInfo);
              //     dom.insertAfter(placeholderDomInfo.el, domInfo.el);
              //     return newDomList;
              //   }, [])
              //   // 刷新elIndex
              //   .map((item, index) => {
              //     return {
              //       ...item,
              //       elIndex: index,
              //     };
              //   });
            }
          }

          /**
           * expanded/树表格的处理, 关闭展开行
           */
          const { item } = evt;
          const domInfo = mapping.get(item);
          // 收起拖动的行的已展开行
          dom.toggleExpansion(domInfo, false);
        },
        onMove(evt) {
          const { related, willInsertAfter, dragged, to, from } = evt;
          const fromContext = context.get(from);
          const toContext = context.get(to);
          /** @type {DomInfo} */
          const draggedDomInfo =
            fromContext[DOM_MAPPING_NAME].mapping.get(dragged);
          /** @type {DomInfo} */
          const relatedDomInfo =
            toContext[DOM_MAPPING_NAME].mapping.get(related);

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

          /**
           * 判断是否需要修正当前dragged的对应level
           */
          const targrtDomInfo = fixDomInfoByDirection(
            relatedDomInfo,
            draggedDomInfo,
            willInsertAfter
          );
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
          const toDomInfo = fixDomInfoByDirection(
            toDomInfoList.find((domInfo) => domInfo.elIndex === newIndex),
            fromDomInfo,
            newIndex > oldIndex
          );

          /**
           * 数据层面的交换
           */
          // mapping层面的交换
          exchange(
            fromDomInfo.index,
            fromDomInfo.parent.childrenList,
            toDomInfo.index,
            toDomInfo.parent.childrenList,
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
          }, 0);
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
      return {
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
        onMove(evt) {
          const { related, willInsertAfter, dragged } = evt;
          dom.alignmentTableByThList(Array.from(dragged.parentNode.childNodes));
          // 需要交换两列所有的td
          const thList = [dragged, related];
          const [fromTdList, toTdList] = (
            willInsertAfter ? thList : thList.reverse()
          ).map((th) => dom.getTdListByTh(th));

          fromTdList.forEach((fromTd, index) => {
            const toTd = toTdList[index];
            // 交换td位置
            dom.exchange(fromTd, toTd, animation);
          });
        },
        onEnd(evt) {
          const PROP = "columns";
          // 会交换value的值，达成v-model
          dom.cleanUp();
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
        },
      };
    },
  },
};
