import { Suspense } from "react";
import AIPageContent from "./AIPageContent";

export const metadata = {
  title: "Ask AI",
  description: "Get instant answers to your questions about Superwall.",
};

export default function AIPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-[calc(100vh-var(--fd-nav-height,56px))]">
      <Suspense fallback={<div>Loading...</div>}>
        <AIPageContent />
      </Suspense>
    </main>
  );
}