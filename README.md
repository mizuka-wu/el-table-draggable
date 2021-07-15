# el-table-draggable

让`vue-draggable`支持`element-ui`中的`el-table`

## 特性

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
        <el-table></el-table>
    </el-table-draggable>
</template>
```

### props

差不多支持所有[sortablejs的option](https://github.com/SortableJS/Sortable#options)