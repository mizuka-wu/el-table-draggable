/* eslint-disable no-unused-vars */
import Sortable from "sortablejs";
const { utils } = Sortable;
const { css } = utils;

const animatedList = [];

/**
 * 添加动画
 * @param {Element} el
 * @param {string} transform
 * @param {number} animate
 */
function addAnimate(el, transform, animate = 0) {
  css(el, "transitionProperty", `transform`);
  css(el, "transitionDuration", animate + "ms");
  css(el, "transform", transform);
  animatedList.push(el);
}

function clearAnimate() {
  animatedList.forEach(el => {
    css(el, "transform", "");
    css(el, "transitionProperty", "");
    css(el, "transitionDuration", "");
  });
  animatedList.splice(0);
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
          .filter(item => item !== newNode);
        const newNodeHeight =
          offset > 0 ? -1 * newNode.offsetHeight : newNode.offsetHeight;
        nodes.forEach(node =>
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
      to: nextNode
    },
    {
      from: nextNode,
      to: prevNode
    }
  ];
  exchangeList.forEach(({ from, to }) => {
    const fromPostion = from.getBoundingClientRect();
    const toPosition = to.getBoundingClientRect();
    const transform = `translate(${toPosition.x - fromPostion.x}px, ${toPosition.y - fromPostion.y}px)`
    addAnimate(from, transform, animate);
  });

//   setTimeout(() => {
//     clearAnimate();
//   }, animate);
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
  return Array.from(trList).map(tr => tr.children[index]);
}

export default {
  getTdListByTh,
  insertAfter,
  insertBefore,
  exchange
};
