/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom, { EMPTY_FIX_CSS } from "./dom";
import { getLevelFromClassName, get } from "./utils";

export const DOM_MAPPING_NAME = "_mapping";

/**
 * Dom映射表
 * @typedef {{ el:Element, level: number, data: any[],index: number, parent: DomInfo | null, childrenList: Element[] }} DomInfo
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

  const trList = tableInstance.$el.querySelectorAll(`${CONFIG.ROW.WRAPPER} tr`);
  trList.forEach((tr) => {
    const { className } = tr;
    // expanded的行自动和最近那个操作的行绑定
    if (!className) {
      if (latestDomInfo) {
        latestDomInfo.childrenList.push(tr);
      }
      return;
    }

    // 创建dom对应的信息
    const level = getLevelFromClassName(tr.className);
    /** @type {DomInfo} */
    const domInfo = {
      el: tr,
      level,
      data,
      index: 0,
      parent: null,
      childrenList: [],
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
          childrenList.forEach((tr) => {});
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

          // 交换dom位置
          exchange(oldIndex, fromList, newIndex, toList, pullMode);

          // 通知更新
          updateElTableInstance(from, to, context, function (tableContext) {
            const draggableContext = tableContext.$parent;

            const data = tableContext[PROP];
            draggableContext.$emit("input", data);
          });

          // 重新开始dom变化的监听
          // startObserver();
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
