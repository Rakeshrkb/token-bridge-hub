import { defineTool } from "@lovable.dev/mcp-js";
import { BRIDGE_TOKENS, BRIDGE_CHAINS } from "@/lib/bridge";

export default defineTool({
  name: "list_bridge_tokens",
  title: "List bridgeable tokens",
  description:
    "List the tokens Bridgr can move across chains (native ETH plus supported ERC20s), with per-chain token addresses where applicable.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const tokens = BRIDGE_TOKENS.map((t) => ({
      key: t.key,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      isNative: t.isNative,
      addresses: t.isNative
        ? {}
        : Object.fromEntries(
            Object.values(BRIDGE_CHAINS).map((c) => [c.chainId, c.tokens[t.key] ?? null]),
          ),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(tokens, null, 2) }],
      structuredContent: { tokens },
    };
  },
});
