// lib/remark-follow-export.js
import fs from 'fs/promises';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';

/*
This plugin fixes the table of contents for pages that use the export syntax.
aka just spit out the contents of another file.

ex:
```mdx
export { default } from '../../using-revenuecat.mdx'
```
*/


import type {} from 'unist';

declare module 'unist' {
  interface Data {
    toc?: unknown;
  }
}

const RE_EXPORT = /^export\s+\{\s*default\s*\}\s+from\s+['"](.+?)['"]\s*;?$/m;

export default function remarkFollowExport() {
  return async (tree: any, file: any) => {
    const esm = tree.children.find(
      (n: any) => n.type === 'mdxjsEsm' && RE_EXPORT.test(n.value)
    );
    if (!esm) return; // regular page, nothing to do

    const [, rel] = esm.value.match(RE_EXPORT) || [];
    if (!rel) return;

    const targetPath = path.resolve(path.dirname(file.path), rel);
    const targetSrc = await fs.readFile(targetPath, 'utf8');

    /* Parse the target file so we can replace the AST */
    const targetTree = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(remarkFrontmatter, ['yaml'])
      .parse(targetSrc);

    /** Replace the current tree's children with the target's children */
    tree.children = targetTree.children;

    /** Merge the target file's data with the current file's data */
    file.data = { ...targetTree.data, ...file.data };
  };
}