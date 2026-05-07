import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/idl/anderdzi.json";
import type { Anderdzi } from "@/idl/anderdzi";
import { PROGRAM_ID } from "@/lib/constants";

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as Parameters<typeof AnchorProvider>[1],
      { commitment: "confirmed" }
    );

    return new Program<Anderdzi>(idl as Anderdzi, provider);
  }, [connection, wallet]);

  return { program, connection, wallet };
}
