import Mock from "mockjs"
export const columns = [
    {
        key: "index",
        type: "number"
    },
    {
        key: "id",
        type: "guid"
    },
    {
        key: "name",
        type: "name"
    },
    {
        key: "url",
        type: "url"
    },
]

const mockTemplate = Object.fromEntries(columns.map(({ key, type }) => [key, `@${type}`]))

export function createData(total = 5) {
    return Array.from(new Array(total)).map((key, index) => {
        return {
            ...Mock.mock(mockTemplate),
            index
        }
    })
}