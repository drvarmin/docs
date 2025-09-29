import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";
import { Suspense } from "react";
import AIPageContent from "./AIPageContent";

export const metadata = {
  title: "Ask AI",
  description: "Get instant answers to your questions about Superwall.",
};

export default function AIPage() {
  return (
    <DocsPage toc={[]} full={false}>
      <DocsTitle>Ask AI</DocsTitle>
      <DocsDescription>Get instant answers to your questions about Superwall.</DocsDescription>
      <DocsBody>
        <Suspense fallback={<div>Loading...</div>}>
          <AIPageContent />
        </Suspense>
      </DocsBody>
    </DocsPage>
  );
}