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
      BnM: "0x334aE912E59ec7cAe23A12d631cFb6F4889dB80F",
    },
  },
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    contract: "0x3e4Fe7d25dE550bEacFC185a7fef83270717eEaA",
    selector: 10344971235874465080n,
    tokens: {
      BnM: "0x47b341EB45FC6E69Eee17bD6D85d82CC56ad6624",
    },
  },
};

export type BridgeTokenMeta = {
  key: string; // logical key, e.g. "ETH" or "BnM"
  symbol: string;
  isNative: boolean;
  decimals: number;
  logo?: string;
};

export const NATIVE_TOKEN: BridgeTokenMeta = {
  key: "ETH",
  symbol: "ETH",
  isNative: true,
  decimals: 18,
  logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
};

export const BRIDGE_TOKENS: BridgeTokenMeta[] = [
  NATIVE_TOKEN,
  {
    key: "BnM",
    symbol: "CCIP-BnM",
    isNative: false,
    decimals: 18,
    logo: "https://smartcontract.imgix.net/tokens/ccip-bnm.webp?auto=compress%2Cformat",
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
