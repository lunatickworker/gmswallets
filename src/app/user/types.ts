export type Tab =
  | "home" | "wallet" | "buy" | "swap" | "send" | "receive"
  | "history" | "notifications" | "profile" | "security" | "settings";

export interface UserProfile {
  id: string;
  email: string;
  auth_user_id: string | null;
  wallet_address: string | null;
  wallet_status: string;
  status: string;
  kyc_tier: string;
  role: string;
  joined_at: string;
  tx_count: number;
  partner_id: string | null;
}

export interface Tx {
  id: string;
  type: string;
  amount: string;
  currency: string;
  from_currency?: string;
  to_currency?: string;
  status: string;
  tx_hash?: string;
  created_at: string;
}

export interface ChainConfig {
  id: string; label: string; color: string; chainId: number | null;
  symbol: string; path: string; type: string; note: string;
}

export interface ChainWallet {
  chain_name: string; chain_id: number | null; network: string;
  address: string; derivation_path: string; is_primary: boolean;
}

export interface TransakQuote {
  fiatCurrency: string;
  cryptoCurrency: string;
  fiatAmount: number;
  cryptoAmount: number;
  totalFee: number;
  quoteId?: string;
}

export interface TransakOrder {
  id: string;
  status: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
}
