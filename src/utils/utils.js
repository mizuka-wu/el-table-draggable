/**
 * 根据行名称获取当前
 */
export function getLelveFromClassName(className) {
    const level = (/--level-(\d+)/.exec(className) || [])[1];
    return +level;
}

export default {
    getLelveFromClassName
}