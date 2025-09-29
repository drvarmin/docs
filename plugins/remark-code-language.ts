import { visit } from "unist-util-visit"

/*
Fixes the language of code blocks

1. fumadocs is case sensitive
input:
```Swift Swift
...
```

output:
```swift Swift
...
```

2. groovy for syntax highlighting gradle
input:
```gradle build.gradle
...
```

output:
```groovy gradle
...
```
*/
export default function remarkCodeLanguage() {
  return (tree: any) => {
    visit(tree, "code", (node) => {
      if (node.lang) {
        // Preserve the original meta info
        const originalMeta = node.meta

        // Special case for gradle -> groovy conversion
        if (node.lang.toLowerCase() === "gradle") {
          node.lang = "groovy"
          // If no meta exists, use the original lang as meta
          if (!originalMeta) {
            node.meta = "gradle"
          }
        } else {
          // For all other languages, just convert to lowercase
          node.lang = node.lang.toLowerCase()
        }

        // If meta was present in original, restore it
        if (originalMeta) {
          node.meta = originalMeta
        }
      }
    })
  }
}
