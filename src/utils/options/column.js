/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import dom from "@/utils/dom";
import {
    updateElTableInstance,
    getOnMove,
    exchange,
} from "@/utils/utils";

export const WRAPPER = ".el-table__header-wrapper thead tr"
export const DRAGGABLE = "th"

/**
 * 行列的基础config
 */
export const config = {
    WRAPPER: ".el-table__header-wrapper thead tr",
    DRAGGABLE: "th",
    /**
     * @param {Map<Element, Vue>} context
     * @param {Vue} elTableInstance
     * @param {number} animation
     * @returns {import('@types/sortablejs').SortableOptions}
     */
    OPTION(context, elTableInstance, animation) {
        let isDragging = false // 正在拖拽
        let columnIsMoving = false // 列正在移动
        // 自动对齐
        function autoAlignmentTableByThList(thList) {
            if (!isDragging) {
                return
            }
            dom.alignmentTableByThList(thList)
            return requestAnimationFrame(() => {
                autoAlignmentTableByThList(thList)
            })
        }

        /** 列宽的虚拟dom */
        let colDomInfoList = []

        return {
            onStart() {
                const thList = Array.from(elTableInstance.$el.querySelector(WRAPPER).childNodes)

                colDomInfoList = thList.map(th => {
                    const col = dom.getColByTh(th)
                    const width = col ? col.getAttribute('width') : th.offsetWidth
                    return {
                        el: col,
                        thEl: th,
                        width: width,
                        originWidth: width
                    }
                })

                // dragging状态自动调用对齐
                isDragging = true
                autoAlignmentTableByThList(thList)
            },
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
                    (offsetLeft * 2) + (offsetWidth / 2),
                    offsetHeight / 2
                );
                setTimeout(() => {
                    document.body.removeChild(wrapper);
                });
            },
            onMove(evt, originEvent) {
                const { related, dragged, relatedRect, draggedRect } = evt;
                let { willInsertAfter } = evt;

                // 根据用户选择
                const onMove = getOnMove(elTableInstance);
                const onMoveResult = onMove(evt, originEvent)
                switch (onMoveResult) {
                    case 1: {
                        willInsertAfter = true;
                        break;
                    }
                    case -1: {
                        willInsertAfter = false;
                        break;
                    }
                    case false: {
                        return false;
                    }
                    default: {
                        break;
                    }
                }

                /**
                 * 对dom进行操作
                 */
                const thList = willInsertAfter ? [dragged, related] : [related, dragged];
                // 临时修改两个的宽度, 需要在下个循环触发，省的宽度不一致导致因为dom变化再次触发拖拽
                const colList = thList
                    .map(th => colDomInfoList.find(item => item.thEl === th))
                // 交换宽度
                if (colList.length !== 2) {
                    throw new Error('无法找到拖拽的th的信息，请检查是否跨表格拖拽了')
                    return true
                }
                const [fromCol, toCol] = colList
                setTimeout(() => {
                    dom.swapDom(fromCol.el, toCol.el)
                    // 交换colDomInfoList内位置
                    const oldIndex = colDomInfoList.indexOf(fromCol)
                    const newIndex = colDomInfoList.indexOf(toCol)
                    exchange(oldIndex, colDomInfoList, newIndex, colDomInfoList)
                })

                return true;
            },
            onEnd(evt) {
                const PROP = "columns";
                dom.cleanUp();
                // 清除所有临时交换产生的设定和变量
                colDomInfoList.forEach(({ el, originWidth }) => {
                    if (el) {
                        el.setAttribute('width', originWidth)
                    }
                })

                isDragging = false

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
};

export default config
