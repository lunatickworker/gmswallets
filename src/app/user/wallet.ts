import { ethers } from "ethers";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { hmac } from "@noble/hashes/hmac.js";
import { base58check, base58 } from "@scure/base";
import type { ChainWallet } from "./types";

export function deriveEvmAddress(mnemonic: string): string {
  return ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0").address;
}

export function deriveTronAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const hd = HDKey.fromMasterSeed(seed);
  const child = hd.derive("m/44'/195'/0'/0/0");
  const privKey = child.privateKey!;
  const pubKeyUncompressed = secp256k1.getPublicKey(privKey, false).slice(1);
  const hash = keccak_256(pubKeyUncompressed);
  const tronRaw = new Uint8Array([0x41, ...hash.slice(12)]);
  return base58check(sha256).encode(tronRaw);
}

export function deriveBitcoinAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const hd = HDKey.fromMasterSeed(seed);
  const child = hd.derive("m/44'/0'/0'/0/0");
  const pubKey = child.publicKey!;
  const hash160 = ripemd160(sha256(pubKey));
  const btcRaw = new Uint8Array([0x00, ...hash160]);
  return base58check(sha256).encode(btcRaw);
}

export function deriveSolanaAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed);
  let kL = I.slice(0, 32);
  let kR = I.slice(32);
  for (const idx of [44 + 0x80000000, 501 + 0x80000000, 0x80000000, 0x80000000]) {
    const buf = new Uint8Array(37);
    buf[0] = 0x00;
    buf.set(kL, 1);
    new DataView(buf.buffer).setUint32(33, idx >>> 0, false);
    const newI = hmac(sha512, kR, buf);
    kL = newI.slice(0, 32);
    kR = newI.slice(32);
  }
  return base58.encode(ed25519.getPublicKey(kL));
}

export function generateAllChainWallets(mnemonic: string): ChainWallet[] {
  const evmAddress  = deriveEvmAddress(mnemonic);
  const tronAddress = deriveTronAddress(mnemonic);
  const btcAddress  = deriveBitcoinAddress(mnemonic);
  const solAddress  = deriveSolanaAddress(mnemonic);
  return [
    { chain_name: "polygon",  chain_id: 137,  network: "mainnet", address: evmAddress,  derivation_path: "m/44'/60'/0'/0/0",  is_primary: true  },
    { chain_name: "ethereum", chain_id: 1,    network: "mainnet", address: evmAddress,  derivation_path: "m/44'/60'/0'/0/0",  is_primary: false },
    { chain_name: "bnb",      chain_id: 56,   network: "mainnet", address: evmAddress,  derivation_path: "m/44'/60'/0'/0/0",  is_primary: false },
    { chain_name: "tron",     chain_id: null, network: "mainnet", address: tronAddress, derivation_path: "m/44'/195'/0'/0/0", is_primary: false },
    { chain_name: "bitcoin",  chain_id: null, network: "mainnet", address: btcAddress,  derivation_path: "m/44'/0'/0'/0/0",   is_primary: false },
    { chain_name: "solana",   chain_id: null, network: "mainnet", address: solAddress,  derivation_path: "m/44'/501'/0'/0'",  is_primary: false },
  ];
}
