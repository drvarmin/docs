import { defineDocs, defineConfig } from "fumadocs-mdx/config"
import remarkTabsSyntax from "./plugins/remark-tabs-syntax"
import remarkCodeGroupToTabs from "./plugins/remark-codegroup-to-tabs"
import remarkCodeLanguage from "./plugins/remark-code-language"
import remarkImagePaths from "./plugins/remark-image-paths"
import remarkFollowExport from "./plugins/remark-follow-export"
import remarkDirective from "remark-directive"
import { remarkInclude } from 'fumadocs-mdx/config';
import remarkSdkFilter from "./plugins/remark-sdk-filter"

// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
// export const docs = defineDocs({
//   dir: "../../content/docs",
//   // dir: "content/docs",
// })

import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const docs = defineDocs({
  dir: path.resolve(process.cwd(), "content/docs"),
})

export default defineConfig({
  mdxOptions: {
    // MDX options
    // remarkPlugins: [remarkImagePaths, remarkTabsSyntax, remarkCodeLanguage, remarkCodeGroupToTabs],
    remarkPlugins: (existing) => [
      remarkImagePaths, // needs to run before existing plugins
      remarkFollowExport,
      ...existing,
      remarkInclude,
      remarkDirective,
      remarkTabsSyntax,
      remarkCodeLanguage,
      remarkCodeGroupToTabs,
      remarkSdkFilter,
    ],
  },
})
