import { visit } from 'unist-util-visit'

/*
This plugin filters the contents of the SDKContent block for use in the SDK-specific LLM txt files

ex:
```mdx
<SDKContent only="expo">
  <p>Expo-only content</p>
</SDKContent>
<SDKContent only="ios">
  <p>iOS-only content</p>
</SDKContent>
```

will only show the content for the specified SDK.
*/
export function remarkFilterSdk(sdk = 'expo') {
  return (tree: any) => {
    visit(tree, 'mdxJsxFlowElement', (node, idx, parent) => {
      if (node.name !== 'SDKContent') return

      const onlyAttr = node.attributes.find((a: any) => a.name === 'only')
      const allowed = Array.isArray(onlyAttr?.value)
        ? onlyAttr.value.map((v: any) => v.value)
        : String(onlyAttr?.value || '').split(',').map((s: any) => s.trim())

      if (!allowed.includes(sdk)) {
        parent.children.splice(idx, 1)              // ❌ remove block
        return idx                                  // keep index stable
      }

      // ✅ keep block — replace wrapper with its children
      parent.children.splice(idx, 1, ...node.children)
      return idx
    })
  }
}