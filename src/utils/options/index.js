/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
/**
 * 根据不同类型使用不同的option
 */
import rowConfig from './row'
import columnConfig from './column'
  
export { DOM_MAPPING_NAME } from './constant'
  
  /**
   * 行列的基础config
   */
  export const CONFIG = {
    ROW: rowConfig,
    COLUMN: columnConfig,
  };
  