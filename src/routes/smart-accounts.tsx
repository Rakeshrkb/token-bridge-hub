import { createFileRoute } from "@tanstack/react-router";
import { SmartAccountBridgeCard } from "@/components/SmartAccountBridgeCard";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/smart-accounts")({
  head: () => ({
    meta: [
      { title: "Smart Accounts — BridgeX cross-chain bridge" },
      {
        name: "description",
        content:
          "Bridge tokens across testnets using your BridgeX smart account. View your deterministic smart account address, send and receive assets.",
      },
      { property: "og:title", content: "Smart Accounts — BridgeX cross-chain bridge" },
      {
        property: "og:description",
        content: "Bridge with a smart account: deterministic address, send and receive assets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SmartAccountsPage,
});

function SmartAccountsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[#627EEA]/15 blur-[140px]" />
      </div>

      <Header />

      <main className="flex flex-col items-center px-4 pb-20 pt-4 md:pt-6">
        <SmartAccountBridgeCard />
      </main>
    </div>
  );
}
