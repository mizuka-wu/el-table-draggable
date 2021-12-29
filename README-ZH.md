# el-table-draggable

让`vue-draggable`支持`element-ui`中的`el-table`

[demo 请查看](https://www.mizuka.top/el-table-draggable/)

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

- [x] 支持列拖动
- [x] 支持拖动展开的列的时候`ghost`显示展开的部分
- [ ] 接入 html2canvas 将展开/列部分设定到 dataTransfer.setDragImage 上实现拖拽优化

## 捐赠

[请我喝咖啡](https://buymeacoffee.com/mizukawu)
