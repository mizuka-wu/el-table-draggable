/**
 * 根据行名称获取当前的层级
 */
export function getLelveFromClassName(className) {
  const level = (/--level-(\d+)/.exec(className) || [])[1] || 0;
  return +(level || 0);
}

export default {
  getLelveFromClassName,
};
