import { createFileRoute } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BridgeCard } from "@/components/BridgeCard";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[#627EEA]/15 blur-[140px]" />
        <div className="absolute bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-[#0052FF]/15 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        {/* LEFT SIDE (logo + nav together) */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white">
              <span className="text-sm font-bold">⇄</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Bridge<span className="text-primary">X</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-foreground">Bridge</a>
            <a className="text-muted-foreground hover:text-foreground transition">
              Docs
            </a>
          </nav>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
          />
        </div>
      </header>

      {/* Hero + Card */}
      <main className="flex flex-col items-center px-4 pb-20 pt-4 md:pt-6">
        <div className="mb-8 max-w-xl text-center">
          {/* <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400" />
            Live on Testnet only
          </div> */}
          {/* <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
            The fastest way to bridge crypto
          </h1> */}
          {/* <p className="mt-3 text-balance text-sm text-muted-foreground md:text-base">
            Move tokens across chains in seconds with the best routes and lowest fees.
          </p> */}
        </div>

        <BridgeCard />
      </main>
    </div>
  );
}
