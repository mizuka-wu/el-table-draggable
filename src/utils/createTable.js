import Mock from "mockjs"
export const columns = [
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
    {
        key: "desc",
        type: "title"
    }
]

const mockTemplate = Object.fromEntries(columns.map(({ key, type }) => [key, `@${type}`]))

export function createData(total = 5) {
    return Array.from(new Array(total)).map(() => {
        return Mock.mock(mockTemplate)
    })
}