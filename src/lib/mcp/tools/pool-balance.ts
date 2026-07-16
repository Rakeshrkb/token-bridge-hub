import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createPublicClient, http, formatUnits } from "viem";
import { sepolia, baseSepolia } from "wagmi/chains";
import {
  BRIDGE_CHAINS,
  BRIDGE_TOKENS,
  ERC20_ABI,
  getTokenPoolAddress,
} from "@/lib/bridge";

function clientFor(chainId: number) {
  if (chainId === sepolia.id) return createPublicClient({ chain: sepolia, transport: http() });
  if (chainId === baseSepolia.id)
    return createPublicClient({ chain: baseSepolia, transport: http() });
  return null;
}

export default defineTool({
  name: "get_destination_pool_balance",
  title: "Get destination pool balance",
  description:
    "Read the current liquidity available in the Bridgr destination pool for a given chain and token. Use this to check if a bridge of a given size can be fulfilled on the destination chain.",
  inputSchema: {
    chainId: z
      .number()
      .describe("Destination chain id (e.g. 11155111 for Sepolia, 84532 for Base Sepolia)."),
    tokenKey: z
      .string()
      .describe("Token key from list_bridge_tokens (e.g. 'ETH' or 'CROSS')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ chainId, tokenKey }) => {
    const chain = BRIDGE_CHAINS[chainId];
    const token = BRIDGE_TOKENS.find((t) => t.key === tokenKey);
    const client = clientFor(chainId);
    if (!chain || !token || !client) {
      return {
        content: [{ type: "text", text: `Unsupported chainId ${chainId} or token ${tokenKey}` }],
        isError: true,
      };
    }

    let raw: bigint;
    let holder: `0x${string}`;
    if (token.isNative) {
      holder = chain.contract;
      raw = await client.getBalance({ address: holder });
    } else {
      const pool = getTokenPoolAddress(chainId, tokenKey);
      const tokenAddr = chain.tokens[tokenKey];
      if (!pool || !tokenAddr) {
        return {
          content: [{ type: "text", text: `No pool configured for ${tokenKey} on chain ${chainId}` }],
          isError: true,
        };
      }
      holder = pool;
      raw = (await client.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [pool],
      })) as bigint;
    }

    const formatted = formatUnits(raw, token.decimals);
    const result = {
      chainId,
      tokenKey,
      symbol: token.symbol,
      poolAddress: holder,
      balance: formatted,
      balanceRaw: raw.toString(),
      decimals: token.decimals,
    };
    return {
      content: [
        {
          type: "text",
          text: `${formatted} ${token.symbol} available in destination pool on chain ${chainId}.`,
        },
      ],
      structuredContent: result,
    };
  },
});
