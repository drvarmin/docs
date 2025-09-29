import { visit } from 'unist-util-visit';

/*
Maps Mintlify CodeGroups to Fumadocs Tabs

input:
<CodeGroup>
```swift Swift
// example swift code
```

```kotlin Kotlin
// example kotlin code
```
</CodeGroup>

output:
<Tabs 
  items={["Swift", "Kotlin"]} 
  groupId="language" 
  persist
>
  <Tab value="Swift">
    ...
  </Tab>
  <Tab value="Kotlin">
    ...
  </Tab>
</Tabs>
*/ 
export default function remarkCodeGroupToTabs() {
  return (tree: any) => {
    visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
      if (node.name !== 'CodeGroup') return;
     
      const codeBlocks = node.children.filter((child: any) => child.type === 'code');
      const labels = codeBlocks.map((block: any) => block.meta || 'Unknown');

      node.name = 'Tabs';
      node.attributes = [
        {
          type: 'mdxJsxAttribute',
          name: 'items',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: JSON.stringify(labels),
            data: {
              estree: {
                type: 'Program',
                sourceType: 'module',
                body: [{
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'ArrayExpression',
                    elements: labels.map((label: string) => ({
                      type: 'Literal',
                      value: label,
                    })),
                  },
                }],
              },
            },
          },
        },
        {
          type: 'mdxJsxAttribute',
          name: 'groupId',
          value: 'language',
        },
        {
          type: 'mdxJsxAttribute',
          name: 'persist',
          value: null,
        }
      ];
      node.children = codeBlocks.map((block: any) => ({
        type: 'mdxJsxFlowElement',
        name: 'Tab',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'value',
            value: block.meta || 'Unknown',
          },
        ],
        children: [block],
      }));
    });
  };
}