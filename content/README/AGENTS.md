---
title: "AGENTS"
---
# SDK Docs Playbook

## Folder layout
content/docs/
  ios/        (root)
  android/    (root)
  flutter/    (root)
  expo/       (root)
  dashboard/  (root)
  overview/   (root)

Each root holds two sub-trees:  
- `guides/` – conceptual docs & tutorials  
- `sdk-reference/` – **one MDX per public symbol**

## Authoring rules
1. Duplicate `_TEMPLATE.mdx` for every new API page.
2. Stick to H2 headings only; keeps auto-ToC shallow.  [oai_citation:7‡fumadocs.dev](https://fumadocs.dev/docs/ui/markdown?utm_source=chatgpt.com)
3. Use Markdown tables for params unless live TS types are available, then `<TypeTable>`.  [oai_citation:8‡aimage.ai](https://aimage.ai/docs/components/type-table?utm_source=chatgpt.com)
4. Wrap multi-platform code in `<Tabs>` **only** if the same page serves multiple SDKs.  [oai_citation:9‡fumadocs.dev](https://fumadocs.dev/docs/ui/components/tabs?utm_source=chatgpt.com)
5. Highlight pitfalls with `<Callout type="warn">`.  [oai_citation:10‡fumadocs.vercel.app](https://fumadocs.vercel.app/docs/ui/mdx/callout?utm_source=chatgpt.com)

## SDK Reference Documentation Guidelines
6. **Callouts ALWAYS at the top**: Always place `<Warning>`, `<Info>`, `<Note>`, `<Tip>` callouts at the TOP of the page, right after the frontmatter. NEVER at the bottom.
7. **Separate code blocks with external descriptions**: Use separate code blocks for different usage examples. Add descriptive text OUTSIDE the code blocks, not as comments inside. Example:
   ```
   Basic configuration:
   ```swift
   Superwall.configure(apiKey: "key")
   ```
   
   With options:
   ```swift
   let options = SuperwallOptions()
   Superwall.configure(apiKey: "key", options: options)
   ```
   ```
8. **Cross-linking**: Link to related APIs throughout the documentation using relative paths (e.g., [`SuperwallOptions`](/ios/sdk-reference/SuperwallOptions)).
9. **Property clarity**: For properties, clearly indicate they are accessed via the shared instance (e.g., "A property on Superwall.shared").
10. **Remove duplication**: Don't repeat the same information in both callouts and parameter descriptions. Keep it in the callout only.
11. **Advanced APIs in subfolder**: Place less common/complex APIs in `/advanced` subfolder with `collapsed: true` in meta.json.

## Example path
`content/docs/expo/sdk-reference/hooks/usePlacement.mdx`

## Adding an API
```bash
cp content/docs/_TEMPLATE.mdx content/docs/expo/sdk-reference/hooks/useNewAPI.mdx
# fill in placeholders, run `pnpm docs:dev`, done
```

## Documentation Content Structure

**CRITICAL: Documentation Source Location**
- **ALWAYS edit documentation in `/content/docs/`** - This is the source of truth
- **NEVER edit files in `/public/`** - These are auto-generated from `/content/docs/`
- Documentation files use `.mdx` extension
- The build process automatically generates files in `/public/` from the source files

### Documentation File Locations
- Source files: `/content/docs/**/*.mdx`
- Generated files: `/public/**/*.md` (DO NOT EDIT)
- Images: `/content/docs/images/`
- Navigation structure: Defined by `meta.json` files in each section

### Adding New Documentation Pages
When adding new documentation pages:
1. Create the `.mdx` file in the appropriate `/content/docs/` subdirectory
2. **Update the corresponding `meta.json` file in the same folder** to include the new page in navigation. If the folder does not contain a catch‑all `"..."` entry, every page must be explicitly listed in its `meta.json`.
3. Group related APIs as nested objects when appropriate (e.g., list `PaywallOptions` under `SuperwallOptions`).
4. The `meta.json` file controls the order and structure of pages in that section
5. Use relative paths without file extensions in `meta.json` (e.g., `"guides/my-new-guide"` not `"guides/my-new-guide.mdx"`)

### Documentation Content Guidelines

#### SDK Documentation Structure
- Each SDK has its own folder: `/content/docs/{sdk}/`
- Standard structure: `quickstart/`, `guides/`, `sdk-reference/`
- Use consistent navigation patterns across SDKs

#### Guide Callouts Pattern
For installation/setup guides, use this pattern:

```mdx
This guide is for [specific audience description].

<Note>
  **This doesn't sound like you?**
  
  - **[Scenario 1]** → [Link to appropriate guide]
  - **[Scenario 2]** → [Link to appropriate guide]
</Note>
```

#### Cross-referencing
- Always link related guides when appropriate
- Use relative paths for internal links
- Keep "What's Next" sections focused and relevant

### Content Writing Standards
- Use clear, concise language
- Start with prerequisites when relevant
- Include code examples that are copy-pasteable
- Reference official external documentation when appropriate
- Focus each guide on a single, specific task

### Images and Assets
- Store images in `/content/docs/images/`
- Use descriptive filenames
- Optimize images for web (reasonable file sizes)
- Include alt text for accessibility

For documentation site infrastructure (build system, deployment, etc.), see `apps/docs/AGENTS.md`.