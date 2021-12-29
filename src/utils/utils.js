import { isVisible } from "./dom";
const LEVEL_REGEXP = /--level-(\d+)/;
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
 * 判断当前表格是否已经树状展开了
 * @param {Vue} tableInstance
 * @returns {boolean}
 */
export function checkIsTreeTable(tableInstance) {
  return Object.keys(tableInstance.store.states.treeData).length > 0;
}

/**
 * 根据方向矫正domInfo
 * 因为多级结构的问题，跨层级需要进行一个修正
 * 例如1，2，3结构，如果2有2-1的话，拖动到2的情况下
 * 其实是希望能够插入到2-1上前
 * 所以实际上需要进行一层index的重新计算，其最末尾一个才是真的index
 * @param {import('./options').DomInfo} domInfo 目标节点
 * @param {import('./options').DomInfo} originDomInfo 原始正在拖拽的
 * @param {boolean} willInsertAfter
 * @returns {import('./options').DomInfo}
 */
export function fixeDomInfoByDirection(
  domInfo,
  originDomInfo,
  willInsertAfter
) {
  if (!willInsertAfter) {
    return domInfo;
  }
  const { childrenList } = domInfo;
  const visibleChildrenList = childrenList.filter((item) => isVisible(item.el));
  // 某个行的根节点上
  if (visibleChildrenList.length > 0) {
    return visibleChildrenList[0];
  }
  // 子节点上
  else if (domInfo.level > 0) {
    const { index, parent } = domInfo;
    const { childrenList } = domInfo.parent;

    // 父亲节点的代理，因为是向下拖拽，实际上的index应该+1
    const parentDomInfoProxy = {
      ...parent,
      index: parent.index + 1,
    };

    // 如果是跨数据层面拖拽，同样需要+1
    const offset = childrenList.includes(originDomInfo) ? 0 : 1;
    const list = [
      ...childrenList.slice(0, childrenList.length - 1).map((item) => ({
        ...item,
        index: item.index + offset,
      })),
      parentDomInfoProxy,
    ];
    return list[index];
  }
  return domInfo;
}

export default {
  getLevelFromClassName,
  getLevelRowClassName,
  checkIsTreeTable,
  fixeDomInfoByDirection,
};
