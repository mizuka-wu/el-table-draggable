/* eslint-disable no-unused-vars */
import Sortable from "sortablejs"
const { utils } = Sortable
const { css } = utils

const animatedList = []

function addAnimate(el, offset, animate = 0) {
    css(el, 'transitionProperty', `transform`)
    css(el, 'transitionDuration', animate + 'ms')
    css(el, 'transform', `translateY(${offset}px)`)
    animatedList.push(el)
}

function clearAnimate() {
    animatedList.forEach(el => {
        css(el, 'transform', '')
        css(el, 'transitionProperty', '')
        css(el, 'transitionDuration', '')
    })
    animatedList.splice(0)
}

export function insertBefore(newNode, referenceNode, animate = 0) {
    /**
     * 动画效果
     * @todo 如果是不同列表，动画方案更新
     */
    if (animate) {
        // 同一列表处理
        if (newNode.parentNode === referenceNode.parentNode) {
            // source
            const offset = newNode.offsetTop - referenceNode.offsetTop
            if (offset !== 0) {
                const subNodes = Array.from(newNode.parentNode.children)
                const indexOfNewNode = subNodes.indexOf(newNode)
                const indexOfReferenceNode = subNodes.indexOf(referenceNode)
                const nodes = subNodes
                    .slice(Math.min(indexOfNewNode, indexOfReferenceNode), Math.max(indexOfNewNode, indexOfReferenceNode))
                    .filter(item => item !== newNode)
                const newNodeHeight = offset > 0 ? (-1 * newNode.offsetHeight) : newNode.offsetHeight
                nodes.forEach(node => addAnimate(node, newNodeHeight, animate))
                addAnimate(newNode, offset, animate)
            }
        } else {
            console.log('非同一列表')
        }

        // 清除
        setTimeout(() => {
            clearAnimate()
        }, animate)
    }
    referenceNode.parentNode.insertBefore(newNode, referenceNode)
  }
  
export function insertAfter(newNode, referenceNode, animate = 0) {
      const targetReferenceNode = referenceNode.nextSibling
      insertBefore(newNode, targetReferenceNode, animate)
  }