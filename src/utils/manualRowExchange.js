    // 以下是交换行相关的操作
    /**
     * 模拟的效果
     */
    function mockExchange (index, targetIndex) {
      if (!this.sortable) {
        return
      }
      const rows = this.$el.querySelectorAll('.el-table__row')
      const orientation = index > targetIndex ? 1 : -1 // 方向参数 1 为向上 -1 为向下
      const offset = orientation * rows[index].offsetHeight // 单次位移的距离

      // rows增加补间动画
      rows.forEach(row => {
        row.style.transition = 'transform 500ms'
      })

      // 生成受影响的index
      let effectedRows = [index, targetIndex].sort(function (i, j) {
        return i > j ? 1 : -1
      })
      // 最大最小 然后补全中间的函数
      const [min, max] = effectedRows
      for (let effectedIndex = min + 1; effectedIndex < max; effectedIndex++) {
        effectedRows.push(effectedIndex)
      }

      // 排除掉index本身并排序(这玩意比较特殊)转为row的列表
      effectedRows = effectedRows
        .filter(effectedIndex => effectedIndex !== index)
        .sort(function (i, j) {
          return i > j ? 1 : -1
        })
        .map(index => rows[index])

      const effectedRowOffset = `${offset}px`
      effectedRows.forEach(row => {
        row.style.transform = `translateY(${effectedRowOffset})`
      })

      // 主体的动画部分 动画结束之后再刷新页面
      const originRow = rows[index]

      // 移动那些受影响的行的高度
      const originRowOffset = effectedRows.reduce(
        (total, row) => (total += row.offsetHeight),
        0
      )
      originRow.style.transform = `translateY(${orientation *
        -1 *
        originRowOffset}px)`
      originRow.style.zIndex = 9999
      originRow.style.boxShadow = '2px 2px 5px #eeeeee'
      setTimeout(() => {
        originRow.style.zIndex = ''
        originRow.style.boxShadow = ''
        this.exchangeRow(index, targetIndex, false)
      }, 500)
    },
    /**
     * 交换行
     * @param {number} index - 原来的index
     * @param {number} targetIndex - 目标的index
     * @param {boolean} mock - 是否模拟排序？只放出动画
     */
    function exchangeRow (index, targetIndex, mock = false) {
      if (!this.sortable) {
        return
      }
      // 一些不能交换的状态
      if (targetIndex < 0) {
        return
      }
      if (index === targetIndex) {
        return
      }
      if (targetIndex > this.data.length) {
        return
      }

      // 如果是mock 模拟交换动画
      if (mock) {
        this.mockExchange(index, targetIndex)
      } else {
        const array = this.data
        const target = array[index]

        const rows = this.$el.querySelectorAll('.el-table__row')
        rows.forEach(row => {
          row.style.transition = ''
          row.style.transform = ''
        })

        const toAfter = targetIndex > index
        // 插入
        this.data.splice(toAfter ? targetIndex + 1 : targetIndex, 0, target)
        // 删除(插入到之前的话，原始index 需要 + 1)
        this.data.splice(toAfter ? index : index + 1, 1)
        this.$emit('exchange', array)
      }
    }
