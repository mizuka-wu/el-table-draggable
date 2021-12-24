/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom, { EMPTY_FIX_CSS } from "./dom";
import { getLevelFromClassName, get } from "./utils";

export const DOM_MAPPING_NAME = "_mapping";

/**
 * Dom映射表
 * @typedef {{ el:Element, elIndex: number, level: number, data: any[],index: number, parent: DomInfo | null, childrenList: DomInfo[] }} DomInfo
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
 * @param {Vue} tableInstance ElTable实例
 * @param {Map<Element, DomInfo>} [mapping]
 * @returns {Map<Element, DomInfo>}
 */
function createOrUpdateDomMapping(tableInstance, mapping = new Map()) {
  // table的配置
  const { data, treeProps } = tableInstance;
  const { children } = treeProps;

  mapping.clear();

  /** @type {DomInfo} 最新被使用的dom */
  let latestDomInfo = {
    el: tableInstance.$el,
    level: 0,
    data,
    index: -1,
    parent: null,
    childrenList: [],
  };

  const trList = tableInstance.$el.querySelectorAll(
    `${CONFIG.ROW.WRAPPER} > tr`
  );
  trList.forEach((tr, index) => {
    const { className } = tr;

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
        })
        latestDomInfo.childrenList.push(domInfo);
      }
      mapping.set(tr, domInfo);
      return;
    }

    // 创建dom对应的信息
    const level = getLevelFromClassName(tr.className);
    domInfo.level = level
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
        // 通过children字端获取下一个data
        const childrenData = latestDomInfo.data[latestDomInfo.index][children];
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

      return {
        onStart(evt) {
          /**
           * 1. 全局暂停监听dom
           * 2. @todo 解决手动关闭后会有的错位问题
           *    导致原因，default-expanded-all
           *    需要记录一下当前打开的行，结束之后还原状态（待定）
           */
          for (const draggableTable of context.values()) {
            draggableTable[DOM_MAPPING_NAME] &&
              draggableTable[DOM_MAPPING_NAME].stop();

            draggableTable.store.states.defaultExpandAll = false
          }

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

          /**
           * expanded/树表格的处理
           */
          const { item } = evt;
          const domInfo = mapping.get(item);
          // 收起拖动的行的已展开行
          const { childrenList } = domInfo;
          childrenList.forEach((children) => {
            /** @todo 改为动画形式 */
            children.el.style.display = "none";
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

          /**
           * list/index需要重新修正计算
           */
          const { to, from, pullMode, newIndex, item } = evt;
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
          const toDomInfo = toDomInfoList.find(
            (domInfo) => domInfo.elIndex === newIndex
          );

          // 交换dom位置
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
           * 将children带回来
           * @type {DomInfo}
           */
          const { childrenList } = fromDomInfo;
          childrenList.forEach((children) => {
            const tr = children.el
            tr.style.display = null;
            /** @todo 增加层级计算, 树结构支持 */
            dom.insertAfter(tr, item);
          });

          /**
           * 全局开始监听dom变化
           */
          for (const draggableTable of context.values()) {
            draggableTable[DOM_MAPPING_NAME] &&
              draggableTable[DOM_MAPPING_NAME].start();
          }
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
