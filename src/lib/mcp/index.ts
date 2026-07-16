import { defineMcp } from "@lovable.dev/mcp-js";
import listChains from "./tools/list-chains";
import listTokens from "./tools/list-tokens";
import poolBalance from "./tools/pool-balance";

export default defineMcp({
  name: "bridgr-mcp",
  title: "Bridgr MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for Bridgr, a testnet ETH/ERC20 bridge between Ethereum Sepolia and Base Sepolia over Chainlink CCIP. Use list_supported_chains and list_bridge_tokens to discover routes, then get_destination_pool_balance to check destination liquidity before recommending a bridge.",
  tools: [listChains, listTokens, poolBalance],
});
