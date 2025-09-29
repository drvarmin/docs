import React from 'react';

// fumadocs-ui 15.3.2 added HideIfEmpty component, but it uses eval() to check if the children are empty
// this is not allowed on cloudflare workers, so we need to replace it

export function HideIfEmpty({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}