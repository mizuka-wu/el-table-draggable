/* eslint-disable no-unused-vars */
import Sortable from "sortablejs";
const { utils } = Sortable;
const { css } = utils;

/** @type {Set<Element>} */
const animatedSet = new Set();

export const ANIMATED_CSS = "el-table-draggable-animated";
const translateRegexp = /translate\((?<x>.*)px,\s?(?<y>.*)px\)/;

/**
 * 获取原始的boundge位置
 * @param {Element} el
 * @param {boolean} ignoreTranslate
 * @returns {{x: number, y: number}}
 */
function getDomPosition(el, ignoreTranslate = true) {
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
 * @param {Element[]} ignoreElList
 */
export function clearAnimate(ignoreElList = []) {
  for (const el of animatedSet.values()) {
    if (ignoreElList.includes(el)) {
      return;
    }
    el.classList.remove(ANIMATED_CSS);
    css(el, "transform", "");
    css(el, "transitionProperty", "");
    css(el, "transitionDuration", "");
    animatedSet.delete(el);
  }
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
      fixFrom: true,
      to: nextNode,
      fixTo: false,
    },
    {
      from: nextNode,
      fixFrom: true,
      to: prevNode,
      fixTo: false,
    },
  ];
  exchangeList.forEach(({ from, to, fixFrom, fixTo }) => {
    const fromPostion = getDomPosition(from, fixFrom);
    const toPosition = getDomPosition(to, fixTo);
    const transform = `translate(${toPosition.x -
      fromPostion.x}px, ${toPosition.y - fromPostion.y}px)`;
    addAnimate(from, transform, animate);
  });
}

/**
 * 从th获取对应的td
 * @todo 支持跨表格获取tds
 * @param {Element} th
 * @param {*} context
 * @returns {Element[]}
 */
export function getTdListByTh(th, context) {
  const index = Array.from(th.parentNode.childNodes).indexOf(th);
  /** @type {{ bodyWrapper: Element }} */
  const { bodyWrapper } = context.get(th.parentNode);
  const trList = bodyWrapper.querySelectorAll("tr");
  return Array.from(trList).map((tr) => tr.children[index]);
}

export default {
  clearAnimate,
  addAnimate,
  ANIMATED_CSS,
  getTdListByTh,
  insertAfter,
  insertBefore,
  exchange,
};
