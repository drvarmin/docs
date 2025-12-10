import Link from 'next/link'
import { source } from '@/lib/source'
import { flattenTree } from 'fumadocs-core/page-tree'

type SupportFolderListProps = {
  folder: string
}

// Build a list of pages under a support folder using the page tree order.
export function SupportFolderList({ folder }: SupportFolderListProps) {
  const normalized = folder.startsWith('/') ? folder : `/${folder}`

  // Support both with and without the /docs base path.
  const prefixes = new Set<string>([normalized])
  if (!normalized.startsWith('/docs')) prefixes.add(`/docs${normalized}`)
  if (normalized.startsWith('/docs')) prefixes.add(normalized.replace(/^\/docs/, '') || '/')

  const baseUrls = Array.from(prefixes)

  const items = flattenTree(source.pageTree.children ?? [])
    .filter(
    (node) =>
      node.type === 'page' &&
      baseUrls.some((prefix) => node.url === prefix || node.url.startsWith(`${prefix}/`)),
    )
    // drop the index/root page so only child articles show
    .filter((node) => !baseUrls.includes(node.url))

  if (!items.length) return null

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.url}>
          <Link href={item.url}>{item.name}</Link>
        </li>
      ))}
    </ul>
  )
}
