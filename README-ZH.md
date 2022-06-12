# el-table-draggable

让`vue-draggable`支持`element-ui`中的`el-table`

[demo 请查看](https://www.mizuka.top/el-table-draggable/)

有问题请提交issue！我不是义务解答员

欢迎提mr改进

## 已知问题

建议使用树状表格拖拽的人不要使用本插件

1. 树状表格向下拖拽/跨越层级拖拽时候move/end的显示结果不一致
2. 树状表格无法判断是拖入子级/同级

## 特性

- 支持几乎所有`sortablejs`的配置
- 支持多个表格之间互相拖动
- 代码提示
- 针对空行进行了处理，可以直接拖动到空的 el-table 内，无论你有没有显示空行的提示行，默认高度为 60px，可以靠`.el-table-draggable__empty-table {min-height: px;}`来自定义

### 目前支持的特性

- 行拖拽
- 列拖拽（>1.1.0）
- 设置 handle
- 设置 group 实现分类拖拽
- 树状表格拖拽 （>1.2.0）
- onMove 支持 （>1.3.0）
- ...其他 sortable.js 的配置
- input 事件，因为 change 事件和 sortable.js 的默认事件重复，改为 input 事件，回调为变化后的行(列)集合

## 安装

### 使用 npm 或者 yarn

```bash
yarn add el-table-draggable

npm i -S el-table-draggable
```

## 使用

```js
import ElTableDraggable from "el-table-draggable";

export default {
  components: {
    ElTableDraggable,
  },
};
```

### template

```html
<template>
  <el-table-draggable>
    <el-table row-key></el-table>
  </el-table-draggable>
</template>
```

### props

#### tag

包裹的组件，默认为 div

#### column

启用列拖拽（试验性功能）0.6 增加

#### onMove

支持`onMove`回调

```javascript
onMove: function (/**Event*/evt, /**Event*/originalEvent, domInfo) {
   // Example: https://jsbin.com/nawahef/edit?js,output
   evt.dragged; // dragged HTMLElement
   evt.draggedRect; // DOMRect {left, top, right, bottom}
   evt.related; // HTMLElement on which have guided
   evt.relatedRect; // DOMRect
   evt.willInsertAfter; // Boolean that is true if Sortable will insert drag element after target by default
   originalEvent.clientY; // mouse position
   
   domInfo.dragged // 拖拽的行的基本信息，包含其所属data，dataindex，parent是哪个domInfo
   domInfo.related // 根据算法算出来的对应dom，树状表格下可能和屏幕上显示的dom不一致
   
   // return false; — for cancel
   // return -1; — insert before target
   // return 1; — insert after target
},
```

#### 其他

差不多支持所有[sortablejs 的 option](https://github.com/SortableJS/Sortable#options)

### 事件

#### input

内部 table 的数据有因为拖动造成的顺序，增减时进行通知

0.5 增加

回调为当前所有行数据

0.6 新增

列模式下，如果有`value`,返回`value`, 否则返回当前列属性列表（property）

#### 其他

差不多支持所有[sortablejs 的 option](https://github.com/SortableJS/Sortable#options)里面那些`on`开头的事件，绑定事件的时候请去掉`on` 例如`onSort => @sort`

## todo

- [ ] 改进树状表格拖拽

## 捐赠

[请我喝咖啡](https://buymeacoffee.com/mizukawu)
