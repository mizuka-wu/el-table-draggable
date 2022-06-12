/* eslint-disable no-unused-vars */
import throttle from "lodash/throttle";
import Sortable from "sortablejs";
const { utils } = Sortable;
const { css } = utils;

/** @type {Set<Element>} */
const animatedSet = new Set();

const LEVEL_REGEXP = /--level-(\d+)/;
export const EMPTY_FIX_CSS = "el-table-draggable__empty-table";
export const ANIMATED_CSS = "el-table-draggable__animated";
export const INDENT_CSS = "el-table__indent";
export const INDENT_PLACEHOLDER_CSS = 'el-table__placeholder' // 子节点的跟随函数
export const CUSTOMER_INDENT_PLACEHOLDER_CSS = 'el-table-draggable__indent-placeholder' // 子节点的跟随函数
export const CUSTOMER_INDENT_CSS = "el-table-draggable__indent";
export const PLACEHOLDER_CSS = 'draggable-dominfo-placeholder'
const translateRegexp = /translate\((?<x>.*)px,\s?(?<y>.*)px\)/;
const elTableColumnRegexp = /el-table_\d*_column_\d*/;

/**
 * 根据行名称获取当前的层级
 * @param {string} className
 * @return {number}
 */
export function getLevelFromClassName(className) {
  const level = (LEVEL_REGEXP.exec(className) || [])[1] || 0;
  return +(level || 0);
}

/**
 * 获取class
 * @param {number} level
 * @returns {string}
 */
export function getLevelRowClassName(level) {
  return `el-table__row--level-${level}`;
}

/**
 * 修改某个dom的className
 * @param {Element} tr
 * @param {number} [targetLevel]
 */
export function changeRowLevel(tr, targetLevel = 0) {
  const sourceLevel = getLevelFromClassName(tr.className);
  if (sourceLevel === targetLevel) {
    return;
  }

  const sourceClassName = getLevelRowClassName(sourceLevel);
  const targetClassName = getLevelRowClassName(targetLevel);
  tr.classList.remove(sourceClassName);
  tr.classList.add(targetClassName);
}

/**
 * 清除造成的所有的副作用
 */
export function cleanUp() {
  /**
   * 清除EMPTY
   */
  Array.from(document.querySelectorAll(`.${EMPTY_FIX_CSS}`)).forEach((el) => {
    el.classList.remove(EMPTY_FIX_CSS);
  });
  // 移除动画的css
  clearAnimate();

  const needRemovedElements = [
    // 树的子级占位
    ...Array.from(document.querySelectorAll(`.${PLACEHOLDER_CSS}`)),
    // 间距的占位
    ...Array.from(document.querySelectorAll(`.${CUSTOMER_INDENT_PLACEHOLDER_CSS}`)),
    ...Array.from(document.querySelectorAll(`.${CUSTOMER_INDENT_CSS}`))
  ]
  setTimeout(() => {
    needRemovedElements.forEach(el => {
      remove(el)
    })
  })
}

/**
 * 重设transform
 * @param {Element} el
 */
function resetTransform(el) {
  css(el, "transform", "");
  css(el, "transitionProperty", "");
  css(el, "transitionDuration", "");
}

/**
 * 获取原始的boundge位置
 * @param {Element} el
 * @param {boolean} ignoreTranslate
 * @returns {DOMRect}
 */
export function getDomPosition(el, ignoreTranslate = true) {
  const position = el.getBoundingClientRect().toJSON();
  const transform = el.style.transform;
  if (transform && ignoreTranslate) {
    const { groups = { x: 0, y: 0 } } = translateRegexp.exec(transform) || {};
    position.x = position.x - +groups.x;
    position.y = position.y - +groups.y;
  }
  return position;
}

/**
 * 添加动画
 * @param {Element} el
 * @param {string} transform
 * @param {number} animate
 */
export function addAnimate(el, transform, animate = 0) {
  el.classList.add(ANIMATED_CSS);
  css(el, "transitionProperty", `transform`);
  css(el, "transitionDuration", animate + "ms");
  css(el, "transform", transform);
  animatedSet.add(el);
}

/**
 * 清除除了可忽略选项内的动画
 * @param {Element[]|Element} targetList
 */
export function clearAnimate(targetList = []) {
  const list = Array.isArray(targetList) ? targetList : [targetList];
  const removedIteratory = list.length ? list : animatedSet.values();
  for (const el of removedIteratory) {
    el.classList.remove(ANIMATED_CSS);
    resetTransform(el);
    if (animatedSet.has(el)) {
      animatedSet.delete(el);
    }
  }
}

/**
 * 获取移动的animate
 * @param {Element} el
 * @param {{x?: number, y?:number}} target
 * @returns {string}
 */
export function getTransform(el, target) {
  const currentPostion = getDomPosition(el);
  const originPosition = getDomPosition(el, true);
  const { x, y } = target;
  const toPosition = {
    x: x !== undefined ? x : currentPostion.x,
    y: y !== undefined ? y : currentPostion.y,
  };
  const transform = `translate(${toPosition.x - originPosition.x}px, ${toPosition.y - originPosition.y
    }px)`;
  return transform;
}

/**
 * 移动到具体位置
 * @param {Element} el
 * @param {{x?: number, y?:number}} target
 * @returns {string}
 */
export function translateTo(el, target) {
  resetTransform(el);
  const transform = getTransform(el, target);
  addAnimate(el, transform)
}

/**
 * 交换
 * @param {Element} newNode
 * @param {Element} referenceNode
 * @param {number} animate
 */
export function insertBefore(newNode, referenceNode, animate = 0) {
  /**
   * 动画效果
   * @todo 如果是不同列表，动画方案更新
   */
  if (animate) {
    // 同一列表处理
    if (newNode.parentNode === referenceNode.parentNode) {
      // source
      const offset = newNode.offsetTop - referenceNode.offsetTop;
      if (offset !== 0) {
        const subNodes = Array.from(newNode.parentNode.children);
        const indexOfNewNode = subNodes.indexOf(newNode);
        const indexOfReferenceNode = subNodes.indexOf(referenceNode);
        const nodes = subNodes
          .slice(
            Math.min(indexOfNewNode, indexOfReferenceNode),
            Math.max(indexOfNewNode, indexOfReferenceNode)
          )
          .filter((item) => item !== newNode);
        const newNodeHeight =
          offset > 0 ? -1 * newNode.offsetHeight : newNode.offsetHeight;
        nodes.forEach((node) =>
          addAnimate(node, `translateY(${newNodeHeight}px)`, animate)
        );
        addAnimate(newNode, `translateY(${offset}px)`, animate);
      }
    } else {
      console.log("非同一列表");
    }

    // 清除
    setTimeout(() => {
      clearAnimate();
    }, animate);
  }
  referenceNode.parentNode.insertBefore(newNode, referenceNode);
}

/**
 * 交换
 * @param {Element} newNode
 * @param {Element} referenceNode
 * @param {number} animate
 */
export function insertAfter(newNode, referenceNode, animate = 0) {
  const targetReferenceNode = referenceNode.nextSibling;
  insertBefore(newNode, targetReferenceNode, animate);
}

/**
 * 交换元素位置
 * @todo 优化定时器
 * @param {Element} prevNode
 * @param {Element} nextNode
 * @param {number} animate
 */
export function exchange(prevNode, nextNode, animate = 0) {
  const exchangeList = [
    {
      from: prevNode,
      to: nextNode,
    },
    {
      from: nextNode,
      to: prevNode,
    },
  ];
  exchangeList.forEach(({ from, to }) => {
    const targetPosition = getDomPosition(to, false);

    // 宽度需要修正
    const { width } = getDomPosition(from, false)
    const targetWidth = targetPosition.width
    if (width !== targetWidth) {
      const offset = width - targetWidth
      targetPosition.x = targetPosition.x + offset
    }
    const transform = getTransform(from, targetPosition);
    addAnimate(from, transform, animate);
  });
}

/**
 * @param {Element} el
 */
export function remove(el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
}

/**
 * 从th获取对应的td
 * @todo 支持跨表格获取tds
 * @param {Element} th
 * @returns {NodeListOf<Element>}
 */
export function getTdListByTh(th) {
  const className = Array.from(th.classList).find((className) =>
    elTableColumnRegexp.test(className)
  );
  return document.querySelectorAll(`td.${className}`);
}

/**
 * 
 * @param {Element} th 
 * @returns {string}
 */
export function getColName(th) {
  const className = Array.from(th.classList).find((className) =>
    elTableColumnRegexp.test(className)
  );
  return className
}

/**
 * 从th获取对应的col
 * @todo 支持跨表格获取tds
 * @param {Element} th
 * @returns {Element}
 */
export function getColByTh(th) {
  const className = getColName(th)
  return document.querySelector(`[name=${className}]`);
}

/**
 * 自动对齐列
 * @param {Element[]|Element} thList
 */
export const alignmentTableByThList = throttle(function alignmentTableByThList(
  thList
) {
  const list = Array.isArray(thList) ? thList : [thList];
  list.forEach((th) => {
    const tdList = getTdListByTh(th);
    tdList.forEach((td) => {
      const { x } = getDomPosition(th);
      translateTo(td, { x });
    });
  });
},
  1000 / 120);

/**
 * 切换row的打开还是关闭
 * @param {import('./options.js').DomInfo} domInfo
 * @param {boolean} expanded 是否收起
 */
export function toggleExpansion(domInfo, expanded = true) {
  // 插入排序需要倒序插入
  domInfo.childrenList
    .slice()
    .reverse()
    .forEach((childrenDomInfo) => {
      if (expanded) {
        // 展开的话，需要显示，并修正位置和indent
        const originDisplay =
          childrenDomInfo.isShow ? null : childrenDomInfo.el.style.display;
        childrenDomInfo.el.style.display = originDisplay;
        insertAfter(childrenDomInfo.el, domInfo.el);
        changeDomInfoLevel(childrenDomInfo, childrenDomInfo.level);
      } else {
        childrenDomInfo.el.style.display = "none";
      }

      /**
       * 处理子节点
       */
      if (childrenDomInfo.childrenList.length) {
        toggleExpansion(childrenDomInfo, expanded);
      }
    });
}

/**
 * 切换某个domInfo的锁进
 * @param {import('./options.js').DomInfo} domInfo
 * @param {number} level
 * @param {number} indent
 * @param {boolean} showPlaceholder 是否显示expanded的占位
 */
export function changeDomInfoLevel(domInfo, level = 0, indent = 16) {
  const { el } = domInfo;
  domInfo.level = level;
  changeRowLevel(el, level);
  const cell = el.querySelector("td:nth-child(1) .cell");
  if (!cell) {
    return;
  }
  // 判断是否拥有indent
  const targetIndent = level * indent;
  let indentWrapper = cell.querySelector(`.${INDENT_CSS}`);
  if (!indentWrapper) {
    indentWrapper = document.createElement("span");
    indentWrapper.classList.add(INDENT_CSS, CUSTOMER_INDENT_CSS);
    insertBefore(indentWrapper, cell.firstChild);
  }
  indentWrapper.style.paddingLeft = `${targetIndent}px`;
  domInfo.childrenList.forEach((children) => {
    changeDomInfoLevel(children, level + 1, indent);
  });

  let placeholderEl = cell.querySelector(`.${INDENT_PLACEHOLDER_CSS}`);
  if (!placeholderEl) {
    placeholderEl = document.createElement('span')
    placeholderEl.classList.add(INDENT_PLACEHOLDER_CSS, CUSTOMER_INDENT_PLACEHOLDER_CSS)
    insertAfter(placeholderEl, indentWrapper)
  }
  placeholderEl.style.display = targetIndent ? null : 'none';
}

/**
 * 交换两个dom的位置
 * @param {Element} a
 * @param {Element} b
 */
export function swapDom(a, b) {
  const p1 = a.parentNode
  const p2 = b.parentNode
  let sib = b.nextSibling;
  if (sib === a) {
    sib = sib.nextSibling
  }
  p1.replaceChild(b, a);
  if (sib) {
    p2.insertBefore(a, sib)
  } else {
    p2.appendChild(a)
  }
  return true;
}

export default {
  alignmentTableByThList,
  getTransform,
  clearAnimate,
  addAnimate,
  ANIMATED_CSS,
  getTdListByTh,
  translateTo,
  getDomPosition,
  insertAfter,
  insertBefore,
  remove,
  exchange,
  cleanUp,
  toggleExpansion,
  changeDomInfoLevel,
  getLevelFromClassName,
  getLevelRowClassName,
  getColByTh,
  getColName,
  swapDom
};
