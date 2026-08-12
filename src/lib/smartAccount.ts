import {
  type Address,
  type Hex,
  type PublicClient,
  type Transport,
  type Chain,
  encodeFunctionData,
} from "viem";
import {
  toSmartAccount,
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import type { WalletClient } from "viem";

// Smart account factory is deployed at the same address on every supported chain.
export const SMART_ACCOUNT_FACTORY =
  "0x47a1999566c71d1E2201D2Fac1771A89b233880e" as `0x${string}`;

// Deterministic salt used for the default smart account of a wallet.
export const DEFAULT_SALT = 0n;

export const SMART_ACCOUNT_EXEC_ABI = [
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeBatch",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "datas", type: "bytes[]" },
    ],
    outputs: [{ type: "bytes[]" }],
    stateMutability: "nonpayable",
  },
] as const;

const FACTORY_ABI = [
  {
    type: "function",
    name: "createAccount",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "account", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAddress",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

export const SMART_ACCOUNT_FACTORY_ABI = [
  {
    type: "function",
    name: "getAddress",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const SMART_ACCOUNT_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export function shortAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function toBridgeXSmartAccount({
  client,
  owner,
  walletClient,
  factoryAddress,
}: {
  client: PublicClient<Transport, Chain | undefined, undefined>;
  owner: Address;
  walletClient: WalletClient;
  factoryAddress: Address;
}) {
  return toSmartAccount({
    client,
    entryPoint: {
      address: entryPoint07Address,
      abi: entryPoint07Abi,
      version: "0.7",
    },

    async getAddress() {
      return client.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "getAddress",
        args: [owner, DEFAULT_SALT],
      }) as Promise<Address>;
    },

    async getFactoryArgs() {
      return {
        factory: factoryAddress,
        factoryData: encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: "createAccount",
          args: [owner, DEFAULT_SALT],
        }),
      };
    },

    async encodeCalls(calls) {
      if (calls.length === 1) {
        const c = calls[0];
        return encodeFunctionData({
          abi: SMART_ACCOUNT_EXEC_ABI,
          functionName: "execute",
          args: [c.to, c.value ?? 0n, c.data ?? "0x"],
        });
      }
      return encodeFunctionData({
        abi: SMART_ACCOUNT_EXEC_ABI,
        functionName: "executeBatch",
        args: [calls.map((c) => c.to), calls.map((c) => c.value ?? 0n), calls.map((c) => c.data ?? "0x")],
      });
    },

    async signMessage({ message }) {
      return walletClient.signMessage({ account: owner, message });
    },

    async signTypedData(typedData) {
      return walletClient.signTypedData({
        account: owner,
        ...typedData,
      } as Parameters<typeof walletClient.signTypedData>[0]);
    },

    async signUserOperation(parameters) {
      const { chainId, ...userOperation } = parameters;
      const hash = getUserOperationHash({
        chainId: chainId ?? (await client.getChainId()),
        entryPointAddress: entryPoint07Address,
        entryPointVersion: "0.7",
        userOperation: {
          ...userOperation,
          sender: userOperation.sender ?? (await this.getAddress()),
        },
      });
      return walletClient.signMessage({ account: owner, message: { raw: hash as Hex } });
    },

    async getStubSignature() {
      return `0x${"e".repeat(130)}` as Hex;
    },
  })};