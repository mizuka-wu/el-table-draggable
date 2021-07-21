# el-table-draggable

[中文文档]('./README-ZH.md')

让`vue-draggable`支持`element-ui`中的`el-table`

[demo请查看](https://www.mizuka.top/el-table-draggable/)

## 特性

- 支持几乎所有`sortablejs`的配置
- 支持多个表格之间互相拖动
- 代码提示
- 针对空行进行了处理，可以直接拖动到空的el-table内，无论你有没有显示空行的提示行，默认高度为60px，可以靠`.el-table-draggable__empty-table {min-height: px;}`来自定义

### 目前支持的特性
* 行拖拽
* 列拖拽
* 设置handle
* 设置group实现分类拖拽
* ...其他sortable.js的配置
* input事件，因为change事件和sortable.js的默认事件重复，改为input事件，回调为变化后的行(列)集合

## 安装

### 使用npm或者yarn

```bash
yarn add el-table-draggable

npm i -S el-table-draggable
```

## 使用

```js
import ElTableDraggable from 'el-table-draggable'

export default {
    components: {
        ElTableDraggable
    }
}
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

包裹的组件，默认为div

#### column

启用列拖拽（试验性功能）0.6增加

#### 其他

差不多支持所有[sortablejs的option](https://github.com/SortableJS/Sortable#options)

### 事件

#### input

内部table的数据有因为拖动造成的顺序，增减时进行通知

0.5增加

回调为当前所有行数据

0.6新增

列模式下，如果有`value`,返回`value`,否则返回当前列属性列表（property）

#### 其他

差不多支持所有[sortablejs的option](https://github.com/SortableJS/Sortable#options)里面那些`on`开头的事件，绑定事件的时候请去掉`on` 例如`onSort => @sort`

## todo

- [x] 支持列拖动  
- [ ] 支持拖动展开的列的时候`ghost`显示展开的部分
- [ ] 接入html2canvas 将展开/列部分设定到dataTransfer.setDragImage上实现拖拽优化

## 捐赠

[请我喝咖啡](https://buymeacoffee.com/mizukawu)
