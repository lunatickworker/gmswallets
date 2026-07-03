import type { ChainConfig } from "./types";

const CHAINS_CONFIG_BASE: Omit<ChainConfig, "note">[] = [
  { id: "polygon",  label: "Polygon",  color: "#8247e5", chainId: 137,  symbol: "MATIC", path: "m/44'/60'/0'/0/0",  type: "evm" },
  { id: "ethereum", label: "Ethereum", color: "#627eea", chainId: 1,    symbol: "ETH",   path: "m/44'/60'/0'/0/0",  type: "evm" },
  { id: "bnb",      label: "BNB",      color: "#f0b90b", chainId: 56,   symbol: "BNB",   path: "m/44'/60'/0'/0/0",  type: "evm" },
  { id: "tron",     label: "Tron",     color: "#e84142", chainId: null, symbol: "TRX",   path: "m/44'/195'/0'/0/0", type: "tron" },
  { id: "bitcoin",  label: "Bitcoin",  color: "#f7931a", chainId: null, symbol: "BTC",   path: "m/44'/0'/0'/0/0",   type: "bitcoin" },
  { id: "solana",   label: "Solana",   color: "#9945ff", chainId: null, symbol: "SOL",   path: "m/44'/501'/0'/0'",  type: "solana" },
];

export const CHAIN_NOTE_KEYS: Record<string, string> = {
  polygon: "chain_note_polygon",
  ethereum: "chain_note_ethereum",
  bnb: "chain_note_bnb",
  tron: "chain_note_tron",
  bitcoin: "chain_note_bitcoin",
  solana: "chain_note_solana",
};

export function getChainNoteKey(id: string): string {
  return CHAIN_NOTE_KEYS[id] ?? "chain_note_polygon";
}

export const CHAINS_CONFIG: ChainConfig[] = CHAINS_CONFIG_BASE.map((c) => ({ ...c, note: "" }));

export const TOKENS = [
  { symbol: "MATIC", name: "Polygon",      color: "#8247e5", price: 0.87,   icon_url: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png" },
  { symbol: "USDC",  name: "USD Coin",     color: "#2775ca", price: 1.00,   icon_url: "https://assets.coingecko.com/coins/images/6319/small/usdc.png" },
  { symbol: "WETH",  name: "Wrapped Ether",color: "#627eea", price: 3412.5, icon_url: "https://assets.coingecko.com/coins/images/2518/small/weth.png" },
];

export const BALANCES = [
  { symbol: "MATIC", amount: 248.31,  usdValue: 216.03 },
  { symbol: "USDC",  amount: 1024.00, usdValue: 1024.00 },
  { symbol: "WETH",  amount: 0.142,   usdValue: 484.58 },
];

export const TOTAL_USD = BALANCES.reduce((s, b) => s + b.usdValue, 0);

export function tokenColor(symbol: string): string {
  return TOKENS.find((t) => t.symbol === symbol)?.color ?? "#6b7280";
}
