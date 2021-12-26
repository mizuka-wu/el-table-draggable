/**
 * 根据行名称获取当前的层级
 * @param {string} className
 * @return {number}
 */
export function getLevelFromClassName(className) {
  const level = (/--level-(\d+)/.exec(className) || [])[1] || 0;
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

export default {
  getLevelFromClassName,
  getLevelRowClassName,
};
