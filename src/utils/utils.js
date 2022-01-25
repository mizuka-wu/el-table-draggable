import { getLevelFromClassName } from "./dom";
/**
 * 判断当前表格是否已经树状展开了
 * @param {Vue} tableInstance
 * @returns {boolean}
 */
export function checkIsTreeTable(tableInstance) {
  return Object.keys(tableInstance.store.states.treeData).length > 0;
}

/**
 * 获取onMove方法
 * @param {Vue} tableInstance
 * @returns {(evt: Sortable.MoveEvent, originalEvent: Event) => boolean | void | 1 | -1}
 */
export function getOnMove(tableInstance) {
  const {
    $props: { onMove },
  } = tableInstance.$parent;
  return onMove || (() => true);
}

/**
 * 判断是否可见
 * @param {Element} el
 * @returns {boolean}
 */
export function isVisible(el) {
  return window.getComputedStyle(el).display !== "none";
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
export function fixDomInfoByDirection(domInfo, originDomInfo) {
  // if (!willInsertAfter) {
  //   return domInfo;
  // }
  const { childrenList } = domInfo;
  const visibleChildrenList = childrenList.filter((item) => isVisible(item.el));
  // 某个行的根节点上
  if (visibleChildrenList.length > 0) {
    return visibleChildrenList[0];
  }
  // 子节点上
  else if (domInfo.level > 0) {
    const { index } = domInfo;
    const { childrenList } = domInfo.parent;

    // 如果是跨数据层面拖拽，同样需要+1
    const offset = childrenList.includes(originDomInfo) ? 0 : 1;
    const list = childrenList.slice(0).map((item) => ({
      ...item,
      index: item.index + offset,
    }));
    return list[index];
  }
  return domInfo;
}

/**
 * 获取最近一个同级的
 * @param {import('./options').DomInfo} domInfo
 * @param {number} [targetLevel]
 * @returns {import('./options').DomInfo | null}
 */
export function getSameLevelParentDomInfo(domInfo, targetLevel = 0) {
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
 * 如果是树状表格，需要增加一个placeholder结构进去
 * @param {Vue} tableInstance ElTable实例
 * @param {Map<Element, import('./options').DomInfo>} [mapping]
 * @param {string} [wrapper] 容器css
 * @param {MappingOberver|null} [observer]
 * @returns {Map<Element, import('./options').DomInfo>}
 */
export function createOrUpdateDomMapping(
  tableInstance,
  mapping = new Map(),
  wrapper = "",
  observer = null
) {
  // table的配置
  const { data, treeProps } = tableInstance;
  const { children } = treeProps;
  mapping.clear();
  observer && observer.stop(); // 停止监听变化，构建完成后继续监听
  const wrapperEl = tableInstance.$el.querySelector(wrapper);

  /** @type {DomInfo} 最新被使用的dom, 默认是采用了整个table作为root */
  let latestDomInfo = {
    el: wrapperEl,
    level: -1,
    // root的data需要特殊处理，通过-1取到
    data,
    index: 0,
    parent: null,
    childrenList: [],
    type: "root",
    isShow: true
  };
  mapping.set(wrapperEl, latestDomInfo);

  const trList = wrapperEl.querySelectorAll("tr");
  trList.forEach((tr, index) => {
    try {
      const { className, style } = tr;
      const isShow = style.display === 'none' ? false : true

      /** @type {DomInfo} */
      const domInfo = {
        elIndex: index,
        el: tr,
        level: 0,
        data,
        index: 0,
        parent: null,
        childrenList: [],
        isShow
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
            type: "proxy",
          });
          latestDomInfo.childrenList.push(domInfo);
        }
        mapping.set(tr, domInfo);
        return;
      }

      // 创建dom对应的信息
      const level = getLevelFromClassName(tr.className);
      domInfo.level = level;
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

          const childrenData =
            latestDomInfo.type === "root"
              ? data
              : latestDomInfo.data[latestDomInfo.index][children];
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
    } catch (e) {
      console.error({
        tr,
        latestDomInfo,
      });
      console.error(e);
    }
  });

  observer && observer.start();
  return mapping;
}

export class MappingOberver {
  /**
   * @param {Vue} elTableInstance
   * @param {string} wrapper
   */
  constructor(elTableInstance, wrapper = ".el-table__body-wrapper tbody") {
    this.elTableInstance = elTableInstance;
    this.mapping = new Map();
    this.wrapper = wrapper;
    this.observer = new MutationObserver(() => {
      createOrUpdateDomMapping(
        this.elTableInstance,
        this.mapping,
        wrapper,
        this
      );
    });
  }
  rebuild() {
    createOrUpdateDomMapping(
      this.elTableInstance,
      this.mapping,
      this.wrapper,
      this
    );
  }
  start() {
    this.observer.observe(
      this.elTableInstance.$el.querySelector(this.wrapper),
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      }
    );
  }
  stop() {
    this.observer.disconnect();
  }
}

/**
 * 给每一行增加占位，方便判定是拖入底下还是拖入同级
 * @todo 增加逻辑
 */
// eslint-disable-next-line no-unused-vars
function rowAddPlaceholder() {
              /**
             * 增加自身子列的占位行
             */
            // if (isTreeTable && domMapping) {
            //   const { treeProps } = draggableTable;
            //   const { children } = treeProps;
            //   /** @type {{ mapping: DomMapping }} */
            //   const { mapping } = domMapping
            //   const trList = Array.from(mapping.values()).filter(({ type = 'leaf' }) => type === 'leaf')
            //   trList.forEach(domInfo => {
            //     const { level, childrenList, el, data, index } = domInfo
            //     const childrenData = data[index][children]
            //     if (childrenData) {
            //       const childrenProxyEl = el.cloneNode()
            //       childrenProxyEl.classList.add(PLACEHOLDER_CSS)
            //       childrenProxyEl.style.width = el.offsetWidth + 'px'
            //       /** @type {DomInfo} */
            //       const proxyDomInfo = {
            //         el: childrenProxyEl,
            //         elIndex: -1,
            //         level: level + 1,
            //         data: childrenData,
            //         index: 0,
            //         type: 'proxy',
            //         parent: domInfo,
            //         childrenList: []
            //       }
                  
            //       let referenceEl = el
            //       if (childrenList.length) {
            //         referenceEl = childrenList[childrenList.length - 1].el
            //         proxyDomInfo.index = childrenList.length
            //       }
            //       childrenList.push(proxyDomInfo) // 数据层面
            //       dom.insertAfter(childrenProxyEl, referenceEl) // dom层面增加
            //       mapping.set(childrenProxyEl, proxyDomInfo)
            //     }
            //   })
            //   // 修正所有tr的elIndex
            //   const trWithProxyTrList = draggableTable.$el.querySelectorAll(
            //     `${CONFIG.ROW.WRAPPER} tr`
            //   )
            //   trWithProxyTrList.forEach((tr, index) => {
            //     const domInfo = mapping.get(tr)
            //     if (domInfo) {
            //       domInfo.elIndex = index
            //     }
            //   })
            // }
}

export default {
  checkIsTreeTable,
  fixDomInfoByDirection,
  getOnMove,
};
