import { visit } from "unist-util-visit"

/*
Maps Mintlify Tabs to Fumadocs Tabs

input:
<Tabs>
  <Tab title="iOS">
  ...
  </Tab>
  <Tab title="Android">
  ...
  </Tab>
</Tabs>

output:
<Tabs items={["iOS", "Android"]}>
  <Tab value="iOS">
    ...
  </Tab>
  <Tab value="Android">
    ...
  </Tab>
</Tabs>
*/
export default function remarkCodeGroupToTabs() {
  return (tree: any) => {
    visit(tree, "mdxJsxFlowElement", (node, index, parent) => {
      if (node.name !== "Tabs") return

      // Find all Tab children
      const tabNodes = node.children.filter(
        (child: any) => child.type === "mdxJsxFlowElement" && child.name === "Tab"
      )

      // Extract titles from Tab nodes
      const titles = tabNodes.map((tab: any) => {
        const titleAttr = tab.attributes.find((attr: any) => attr.name === "title")
        if (!titleAttr?.value) {
          console.warn("Tab missing title attribute, using 'Unknown' as fallback")
        }
        return titleAttr?.value || "Unknown"
      })

      // Update the Tabs node attributes
      node.attributes = [
        {
          type: "mdxJsxAttribute",
          name: "items",
          value: {
            type: "mdxJsxAttributeValueExpression",
            value: JSON.stringify(titles),
            data: {
              estree: {
                type: "Program",
                sourceType: "module",
                body: [
                  {
                    type: "ExpressionStatement",
                    expression: {
                      type: "ArrayExpression",
                      elements: titles.map((title: string) => ({
                        type: "Literal",
                        value: title,
                      })),
                    },
                  },
                ],
              },
            },
          },
        },
      ]

      // Transform Tab nodes to use 'value' instead of 'title'
      node.children = tabNodes.map((tab: any) => {
        const titleAttr = tab.attributes.find((attr: any) => attr.name === "title")
        return {
          ...tab,
          attributes: [
            {
              type: "mdxJsxAttribute",
              name: "value",
              value: titleAttr?.value || "Unknown",
            },
          ],
        }
      })
    })
  }
}
