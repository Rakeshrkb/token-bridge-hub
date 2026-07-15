import { sepolia, baseSepolia } from "wagmi/chains";
import { decodeEventLog, type TransactionReceipt } from "viem";

export const BRIDGE_ABI = [
  {
    type: "function",
    name: "bridge",
    stateMutability: "payable",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      { name: "receiver", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "messageId", type: "bytes32" }],
  },
  {
    type: "event",
    name: "Sent",
    inputs: [
      { name: "messageId", type: "bytes32", indexed: false },
      { name: "destinationChainSelector", type: "uint64", indexed: false },
      { name: "receiver", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;


export const RATE_LIMITER_ABI = [
  {
    type: "function",
    name: "getCurrentRateLimiterState",
    stateMutability: "view",
    inputs: [
      { name: "remoteChainSelector", type: "uint64" },
      { name: "fastFinality", type: "bool" },
    ],
    outputs: [
      {
        name: "outboundRateLimiterState",
        type: "tuple",
        components: [
          { name: "tokens", type: "uint128" },
          { name: "lastUpdated", type: "uint32" },
          { name: "isEnabled", type: "bool" },
          { name: "capacity", type: "uint128" },
          { name: "rate", type: "uint128" },
        ],
      },
      {
        name: "inboundRateLimiterState",
        type: "tuple",
        components: [
          { name: "tokens", type: "uint128" },
          { name: "lastUpdated", type: "uint32" },
          { name: "isEnabled", type: "bool" },
          { name: "capacity", type: "uint128" },
          { name: "rate", type: "uint128" },
        ],
      },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const CROSS_TOKEN_ABI = [
  ...ERC20_ABI,
  {
    type: "function",
    name: "mintFaucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "lastMint",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function getMessageIdFromReceipt(receipt: TransactionReceipt): `0x${string}` | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BRIDGE_ABI,
        data: log.data,
        topics: log.topics,
        eventName: "Sent",
      });
      if (decoded.eventName === "Sent") {
        return decoded.args.messageId;
      }
    } catch {
      // not a Sent event, continue scanning
    }
  }
  return null;
}

export type BridgeChainConfig = {
  chainId: number;
  contract: `0x${string}`;
  selector: bigint;
  // ERC20 token addresses supported on this chain (paired across chains via TOKENS below)
  tokens: Record<string, `0x${string}`>;
};

// The Sepolia bridge was deployed in this block. Activity queries start here so
// we do not scan unrelated historical chain data.
export const SEPOLIA_BRIDGE_DEPLOYMENT_BLOCK = 11251875n;

export const BRIDGE_CHAINS: Record<number, BridgeChainConfig> = {
  [sepolia.id]: {
    chainId: sepolia.id,
    contract: "0x4133727299A02942Ca9a3e18fD11D95DCa3dAdD3",
    selector: 16015286601757825753n,
    tokens: {
      CROSS: "0x334aE912E59ec7cAe23A12d631cFb6F4889dB80F",
    },
  },
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    contract: "0x3e4Fe7d25dE550bEacFC185a7fef83270717eEaA",
    selector: 10344971235874465080n,
    tokens: {
      CROSS: "0x47b341EB45FC6E69Eee17bD6D85d82CC56ad6624",
    },
  },
};

// Map: chainId -> tokenKey -> pool contract address
export const TOKEN_POOLS: Record<number, Record<string, `0x${string}`>> = {
  [sepolia.id]: {
    CROSS: "0x25e9022beBac9001D1Cba2744cfdA068a78F75e9",
    // add more tokens as needed
  },
  [baseSepolia.id]: {
    CROSS: "0x2Cf54C4a8f5B442Fdfc455Be329B4B74580cb336",
  },
};

export function getTokenPoolAddress(
  chainId: number,
  tokenKey: string,
): `0x${string}` | undefined {
  return TOKEN_POOLS[chainId]?.[tokenKey];
}

export type BridgeTokenMeta = {
  key: string; // logical key, e.g. "ETH" or "CROSS"
  symbol: string;
  name: string;
  isNative: boolean;
  decimals: number;
  logo?: string;
};

export const NATIVE_TOKEN: BridgeTokenMeta = {
  key: "ETH",
  symbol: "ETH",
  name: "Ethereum",
  isNative: true,
  decimals: 18,
  logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
};

export const BRIDGE_TOKENS: BridgeTokenMeta[] = [
  NATIVE_TOKEN,
  {
    key: "CROSS",
    symbol: "CROSS",
    name: "CCIPToken",
    isNative: false,
    decimals: 18,
    logo: "https://assets.coingecko.com/coins/images/877/standard/Chainlink_Logo_500.png?1760023405"
  },
];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function getTokenAddress(chainId: number, tokenKey: string): `0x${string}` | undefined {
  if (tokenKey === "ETH") return ZERO_ADDRESS;
  return BRIDGE_CHAINS[chainId]?.tokens[tokenKey];
}

export const isBridgeSupported = (chainId: number) => chainId in BRIDGE_CHAINS;

export function getBridgeChainBySelector(selector: bigint): BridgeChainConfig | undefined {
  return Object.values(BRIDGE_CHAINS).find((chain) => chain.selector === selector);
}
