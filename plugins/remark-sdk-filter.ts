import { visit } from "unist-util-visit";
import type { Parent, Node } from "unist";

/**
 * Remove any SDK‑scoped blocks that do not match the SDK which
 * can be inferred from the pathname:  /docs/<sdk>/...
 *
 * ‑ Supported SDK identifiers: ios, android, expo, flutter
 * ‑ Two syntaxes are recognised:
 *     • MD directive blocks  :::expo  (container / leaf / text directive, node.name === 'expo')
 *     • JSX / HTML elements  <div sdk="expo"> (node.properties.sdk === 'expo')
 */
export default function remarkSdkFilter() {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return (tree: any, vfile: any) => {
    // Get sdk key from the filepath (docs/<sdk>/)
    const match = vfile.path.match(/\/(ios|android|expo|flutter)\//);
    const target: string | undefined = match?.[1];
    if (!target) return; // pages outside docs/<sdk>/ → untouched

    /**
     * Collect indexes of nodes to remove in a parent, then splice at the end
     * to avoid messing up traversal indexes.
     */
    visit(tree, (node: Node, index: number | undefined, parent: Parent | undefined) => {
      if (parent == null || index == null) return;

      // SDK specified via directive name  :::expo
      let label: string | undefined;
      // remark-directive output
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        label = (node as any).name;
      }

      // SDK specified via JSX/HTML property  <div sdk="expo">
      if (!label && (node as any).properties?.sdk) {
        label = (node as any).properties.sdk as string;
      }

      if (label && label !== target) {
        // Remove the node that doesn't match the current section
        parent.children.splice(index, 1);
        return index - 1;   // Re‑check the next node now occupying this index
      }
    });
  };
}