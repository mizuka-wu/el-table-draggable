# el-table-draggable

[中文文档](./README-ZH.md)

Let el-table support sortable.js

[Demo Page](https://www.mizuka.top/el-table-draggable/)

## Features

- support almost all options in `sortablejs`
- support drag from one to another table
- support treeTable
- support vetur
- support onMove
- support drag into an empty `el-table`

### You can see in Demos

- Drag rows
- Drag columns(>1.1.0)
- Drag tree(>1.2.0)
- disable move by set onMove(>1.3.0)
- Set handle for drag
- Set group
- ...other option in sortable.js
- event input, after the change of all

## Install

### use npm or yarn

```bash
yarn add el-table-draggable

npm i -S el-table-draggable
```

## Usage

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

the wrapper tag of el-table, default is `div`

#### column

support drag column

#### onMove

set onMove callback

```javascript
onMove: function (/**Event*/evt, /**Event*/originalEvent, domInfo) {
   // Example: https://jsbin.com/nawahef/edit?js,output
   evt.dragged; // dragged HTMLElement
   evt.draggedRect; // DOMRect {left, top, right, bottom}
   evt.related; // HTMLElement on which have guided
   evt.relatedRect; // DOMRect
   evt.willInsertAfter; // Boolean that is true if Sortable will insert drag element after target by default
   originalEvent.clientY; // mouse position
   
   domInfo.dragged // the origin dom info of dragged tr, like parent domInfo, level, data, and it's index
   domInfo.related // like dragged
   
   // return false; — for cancel
   // return -1; — insert before target
   // return 1; — insert after target
},
```

#### other

[sortablejs's option](https://github.com/SortableJS/Sortable#options)

### Event

#### input

data or cloumn after change

#### other

[sortablejs's option](https://github.com/SortableJS/Sortable#options), the option start with `on`, Example`onSort => @sort`

## todo

- [ ] Tree Table

## Donation

[By me a coffee](https://buymeacoffee.com/mizukawu)
