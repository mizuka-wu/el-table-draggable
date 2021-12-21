/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom, { EMPTY_FIX_CSS } from "./dom";
import { getLelveFromClassName } from "./utils";

export const DOM_MAPPING_NAME = "_mapping";
export const DOM_MAPPING_OBSERVER_NAME = "_mappingObserver";

/**
 * Dom映射表
 * @typedef {{ el:Element, level: number, data: any[],index: number, parent: DomInfo | null, expendTr: Element | null }} DomInfo
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

  if (level > targetLevel || !parent) {
    return null;
  }

  if (level === targetLevel) {
    return domInfo;
  }

  if (level < targetLevel) {
    return getSameLevelParentDomInfo(parent, targetLevel);
  }
}

/**
 * 根据类型当前的dom结构，自动构建每个tr的对应数据关系
 * @param {Vue} tableInstance ElTable实例
 * @returns {Map<Element, DomInfo>}
 */
function createDomMapping(tableInstance) {
  if (!tableInstance[DOM_MAPPING_NAME]) {
    tableInstance[DOM_MAPPING_NAME] = new Map();
  }

  // table的配置
  const { data, treeProps } = tableInstance;
  const { children } = treeProps;

  /** @type {DomMapping} */
  const mapping = tableInstance[DOM_MAPPING_NAME];
  mapping.clear();

  /** @type {DomInfo} 最新被使用的dom */
  let latestDomInfo = {
    el: tableInstance.$el,
    level: 0,
    data,
    index: -1,
    parent: null,
    expendTr: null,
  };

  const trList = tableInstance.$el.querySelectorAll(`${CONFIG.ROW.WRAPPER} tr`);
  trList.forEach((tr) => {
    const { className } = tr;
    // expanded的行自动和最近那个操作的行绑定
    if (!className) {
      latestDomInfo && (latestDomInfo.expendTr = tr);
      return;
    }

    // 创建dom对应的信息
    const level = getLelveFromClassName(tr.className);
    /** @type {DomInfo} */
    const domInfo = {
      el: tr,
      level,
      data,
      index: 0,
      parent: null,
      expendTr: null,
    };
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
        break;
      }
      // 之前的那个tr的下级
      case 1: {
        domInfo.parent = latestDomInfo;
        // 通过children字端获取下一个data
        const childrenData = latestDomInfo.data[latestDomInfo.index][children];
        domInfo.data = childrenData;
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
        break;
      }
    }
    mapping.set(tr, domInfo);
    latestDomInfo = domInfo;
  });
  return mapping;
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
  function flatData(list, level = 0, flated = []) {
    list.forEach((item, index) => {
      flated.push({
        level,
        list,
        index,
        children: item[children],
      });
      // treeData里有它，也就是有子节点
      if (treeData[item[rowKey]]) {
        const subList = item[children];
        flatData(subList, level + 1, flated);
      }
    });
    return flated;
  }

  let flatDom = flatData(data, 0, []);

  // 因为拖拽的时候把子层级排除了，所以这里计算扁平化的时候也要排除, 算法一致
  if (sourceIndex > -1) {
    const sourceItem = flatDom[sourceIndex];
    const sourceItemNextSameLevelIndex = flatDom.findIndex((tr, index) => {
      if (index <= sourceIndex) {
        return false;
      }
      const { level } = tr;
      return level <= sourceItem.level;
    });
    flatDom = flatDom.filter((item, index) => {
      return index <= sourceIndex || index >= sourceItemNextSameLevelIndex;
    });
  }

  return flatDom[targetIndex];
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
 * 交换两个dom元素
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
      /** @type {Element[]} */
      let movingExpandedRows = [];

      /** @type {DomMapping} 映射表 */
      const mapping = createDomMapping(elTableInstance);

      /** 自动监听重建映射表 */
      if (elTableInstance[DOM_MAPPING_OBSERVER_NAME]) {
        elTableInstance[DOM_MAPPING_OBSERVER_NAME].disconnect();
      }
      const observer = new MutationObserver(() => {
        createDomMapping(elTableInstance);
      });
      const startObserver = () => {
        observer.observe(
          elTableInstance.$el.querySelector(CONFIG.ROW.WRAPPER),
          {
            childList: true,
            subtree: true,
          }
        );
      };
      elTableInstance[DOM_MAPPING_OBSERVER_NAME] = observer;
      startObserver();

      return {
        onStart(evt) {
          observer.disconnect();
          console.log(mapping);
          /**
           * 空列表增加empty class 帮助可以拖拽进去
           * 这个是全局需要加的
           */
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
            movingExpandedRows = [expandedTr];
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

            movingExpandedRows = trList.slice(
              oldIndex + 1,
              nextSameLevelTrIndex === -1 ? undefined : nextSameLevelTrIndex
            );
          }

          movingExpandedRows.forEach((tr) => {
            tr.parentNode.removeChild(tr);
          });
        },
        onMove(evt, originalEvt) {
          const { related, willInsertAfter, dragged } = evt;
          /**
           * 如果该行是展开列，需要调整样式
           */
          if (related.className.includes("expanded")) {
            // 预防万一，判断一下展开行下一行是不是真实的已展开的行(没有className)
            const expandedTr =
              related.nextSibling &&
              related.nextSibling.className === "" &&
              related.nextSibling;
            if (expandedTr) {
              setTimeout(() => {
                if (willInsertAfter) {
                  dom.insertAfter(dragged, expandedTr, animation);
                } else {
                  dom.insertBefore(dragged, related, animation);
                }
              });
              return false;
            }
          }
        },
        onEnd(evt) {
          dom.cleanUp();

          const { to, from, pullMode } = evt;
          const toContext = context.get(to);
          let toList = toContext[PROP];
          const fromContext = context.get(from);
          let fromList = fromContext[PROP];
          let { newIndex, oldIndex, item } = evt;

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

          // 交换dom位置
          exchange(oldIndex, fromList, newIndex, toList, pullMode);

          // 通知更新
          updateElTableInstance(from, to, context, function(tableContext) {
            const draggableContext = tableContext.$parent;
            if (movingExpandedRows.length) {
              // 缓存需要展开的row
              const rows = movingExpandedRows;
              rows.forEach((row) => {
                dom.insertAfter(row, item);
              });
              movingExpandedRows = [];
            }

            const data = tableContext[PROP];
            draggableContext.$emit("input", data);
          });

          // 强制清空
          movingExpandedRows = [];
          // 重新开始dom变化的监听
          startObserver();
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
          const [fromTdList, toTdList] = (willInsertAfter
            ? thList
            : thList.reverse()
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
          updateElTableInstance(from, to, context, function(tableContext) {
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
