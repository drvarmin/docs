import { visit } from "unist-util-visit"

/*
Fixes the image paths

input:
<Frame>![](/../images/3pa_cp_2.jpeg)</Frame>

output:
<Frame>![](/images/3pa_cp_2.jpeg)</Frame>
*/

export default function remarkImagePaths() {
  return (tree: any) => {
    const normalizeUrl = (url: string): string => {
      return url.replace(/^(\.\.\/|\/)*/, "/")
    }

    visit(tree, "image", (node) => {
      if (node.url) {
        node.url = normalizeUrl(node.url)
      }
    })

    // Also handle images inside MDX elements (like Frame)
    visit(tree, "mdxJsxFlowElement", (node: any) => {
      if (node.children) {
        node.children.forEach((child: any) => {
          if (child.type === "image" && child.url) {
            child.url = normalizeUrl(child.url)
          }
        })
      }
    })

    // Also handle image attributes like src="/../images/foo"
    visit(tree, "mdxJsxAttribute", (node: any) => {
      if (node.name === "src" && typeof node.value === "string") {
        node.value = normalizeUrl(node.value)
      }
    })
  }
}
