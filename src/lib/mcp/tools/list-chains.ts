import { defineTool } from "@lovable.dev/mcp-js";
import { BRIDGE_CHAINS } from "@/lib/bridge";

export default defineTool({
  name: "list_supported_chains",
  title: "List supported chains",
  description:
    "List the testnet chains Bridgr can bridge between, including chain id, CCIP selector, and the deployed bridge contract address on each chain.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const chains = Object.values(BRIDGE_CHAINS).map((c) => ({
      chainId: c.chainId,
      selector: c.selector.toString(),
      bridgeContract: c.contract,
      tokens: c.tokens,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(chains, null, 2) }],
      structuredContent: { chains },
    };
  },
});
