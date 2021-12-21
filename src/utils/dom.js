/* eslint-disable no-unused-vars */
import throttle from "lodash/throttle";
import Sortable from "sortablejs";
const { utils } = Sortable;
const { css } = utils;

/** @type {Set<Element>} */
const animatedSet = new Set();

export const EMPTY_FIX_CSS = "el-table-draggable__empty-table";
export const ANIMATED_CSS = "el-table-draggable-animated";
const translateRegexp = /translate\((?<x>.*)px,\s?(?<y>.*)px\)/;
const elTableColumnRegexp = /el-table_\d*_column_\d*/;

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
 * @returns {{x: number, y: number}}
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
  const transform = `translate(${toPosition.x -
    originPosition.x}px, ${toPosition.y - originPosition.y}px)`;
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
  el.style.transform = transform;
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
    const transform = getTransform(from, targetPosition);
    addAnimate(from, transform, animate);
  });
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
  return document.querySelectorAll(`.${className}`);
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
1000 / 60);

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
  exchange,
  cleanUp,
};
