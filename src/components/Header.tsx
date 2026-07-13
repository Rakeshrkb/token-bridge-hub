import { Link, useRouterState } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navLinkClass = (active: boolean) =>
    active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground transition";

  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10">
      {/* LEFT SIDE (logo + nav together) */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white">
            <span className="text-sm font-bold">⇄</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Bridge<span className="text-primary">X</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className={navLinkClass(pathname === "/")}>
            Bridge
          </Link>
          <Link to="/docs" className={navLinkClass(pathname === "/docs")}>
            Docs
          </Link>
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
  );
}
