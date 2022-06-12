// eslint-disable-entry-file
export interface DomInfo {
    el: Element
    elIndex: number
    level: number
    data: any[]
    index: number
    parent: DomInfo | null
    childrenList: DomInfo[]
    isShow: boolean
    type: 'root' | 'common' | 'proxy' | 'placeholder'
}

export type DomMapping = Map<Element, DomInfo>