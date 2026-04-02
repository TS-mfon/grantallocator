import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = "0x70a86f37BD82c0DB38D6b3b7067bbC3085319F35";

export const GENLAYER_CHAIN_ID = 61999;
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: "GenLayer Studio",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: [],
};

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
}

export function getEthereumProvider(): EthereumProvider | null {
  return typeof window !== "undefined" ? window.ethereum || null : null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    return await provider.request({ method: "eth_requestAccounts" });
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected the connection request");
    throw new Error(`Failed to connect: ${error.message}`);
  }
}

export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    return await provider.request({ method: "eth_accounts" });
  } catch { return []; }
}

export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return await provider.request({ method: "eth_chainId" });
  } catch { return null; }
}

export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      await provider.request({ method: "wallet_addEthereumChain", params: [GENLAYER_NETWORK] });
    } else if (error.code === 4001) {
      throw new Error("User rejected switching the network");
    } else {
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();
  if (!chainId) return false;
  return parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
}

export async function connectMetaMask(): Promise<string> {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");
  const accounts = await requestAccounts();
  if (!accounts?.length) throw new Error("No accounts found");
  if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
  return accounts[0];
}

export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
    const accounts = await provider.request({ method: "eth_accounts" });
    if (!accounts?.length) throw new Error("No account selected");
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected account switch");
    throw new Error(`Failed to switch: ${error.message}`);
  }
}

export function createGenLayerClient(address?: string) {
  const config: any = { chain: studionet };
  if (address) config.account = address as `0x${string}`;
  try {
    return createClient(config);
  } catch {
    return createClient({ chain: studionet });
  }
}

export function formatAddress(address: string | null, maxLength = 12): string {
  if (!address) return "";
  if (address.length <= maxLength) return address;
  const pre = Math.floor((maxLength - 3) / 2);
  const suf = Math.ceil((maxLength - 3) / 2);
  return `${address.slice(0, pre)}...${address.slice(-suf)}`;
}
