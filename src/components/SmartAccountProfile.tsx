import { useState } from "react";
import { Copy, Check, Send, QrCode, Wallet } from "lucide-react";
import { encodeFunctionData, parseEther, parseUnits, formatUnits, isAddress } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shortAddress } from "@/lib/smartAccount";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { ERC20_ABI, getTokenAddress, BRIDGE_TOKENS } from "@/lib/bridge";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function SmartAccountProfile() {
  const { address, chainId } = useAccount();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"receive" | "send">("receive");
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenKey, setTokenKey] = useState("ETH");

  const { smartAccountAddress: sa, isDeployed, bundlerClient } = useSmartAccount(chainId);
  const tokenMeta = BRIDGE_TOKENS.find((t) => t.key === tokenKey) ?? BRIDGE_TOKENS[0];
  const tokenAddress = chainId ? getTokenAddress(chainId, tokenKey) : undefined;

  const { data: nativeBalance } = useBalance({
    address: sa,
    chainId,
    query: { enabled: Boolean(sa) },
  });

  const { data: erc20Balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: sa ? [sa] : undefined,
    chainId,
    query: { enabled: Boolean(sa && tokenAddress && !tokenMeta.isNative) },
  });

  const balanceLabel = tokenMeta.isNative
    ? nativeBalance
      ? `${Number(nativeBalance.formatted).toFixed(5)} ${nativeBalance.symbol}`
      : "—"
    : erc20Balance !== undefined
      ? `${Number(formatUnits(erc20Balance as bigint, tokenMeta.decimals)).toFixed(5)} ${tokenMeta.symbol}`
      : "—";

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    if (!sa) return;
    await navigator.clipboard.writeText(sa);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

const handleSend = async () => {
    if (!sa || !bundlerClient) return;
    if (!isAddress(to)) {
      toast.error("Enter a valid recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter an amount");
      return;
    }

    try {
      const call = tokenMeta.isNative
        ? { to: to as `0x${string}`, value: parseEther(amount), data: "0x" as `0x${string}` }
        : (() => {
            if (!tokenAddress) throw new Error("Token not supported on this chain");
            return {
              to: tokenAddress,
              value: 0n,
              data: encodeFunctionData({
                abi: ERC20_TRANSFER_ABI,
                functionName: "transfer",
                args: [to as `0x${string}`, parseUnits(amount, tokenMeta.decimals)],
              }),
            };
          })();

      setSending(true);
      const hash = await bundlerClient.sendUserOperation({ calls: [call] });
      toast.success("Transfer submitted from smart account", {
        description: `${hash.slice(0, 10)}…${hash.slice(-6)}`,
      });

      setSending(false);
      setConfirming(true);
      await bundlerClient.waitForUserOperationReceipt({ hash });
      toast.success("Transfer confirmed");
      setTo("");
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.split("\n")[0] : "Failed to send");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  if (!address) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium transition hover:bg-accent">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-[10px] text-white">
            <Wallet className="h-3 w-3" />
          </span>
          <span className="hidden sm:inline font-mono text-xs">{shortAddress(sa)}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Smart account</DialogTitle>
          <DialogDescription>
            Smart account owned by your connected wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Address</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="break-all font-mono text-sm">{sa ?? "Loading…"}</span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                isDeployed
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {isDeployed ? "Deployed" : "Not deployed"}
            </span>
            <button
              onClick={copy}
              className="shrink-0 rounded-md border border-border p-2 transition hover:bg-accent"
              aria-label="Copy smart account address"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Balance: <span className="font-mono text-foreground">{balanceLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={tab === "receive" ? "default" : "outline"}
            onClick={() => setTab("receive")}
          >
            <QrCode className="mr-2 h-4 w-4" /> Receive
          </Button>
          <Button variant={tab === "send" ? "default" : "outline"} onClick={() => setTab("send")}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
        </div>

        {tab === "receive" ? (
          <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
            Send any supported asset on this network to the address above. Funds held by the smart
            account are used for bridging.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              {BRIDGE_TOKENS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTokenKey(t.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    tokenKey === t.key
                      ? "border-primary text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient address (0x…)"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder={`Amount in ${tokenMeta.symbol}`}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button
              className="w-full"
              onClick={handleSend}
              disabled={sending || confirming || !sa || !bundlerClient}
            >
              {sending ? "Confirm in wallet…" : confirming ? "Sending…" : `Send ${tokenMeta.symbol}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
