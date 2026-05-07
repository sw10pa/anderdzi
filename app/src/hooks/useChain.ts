import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProgram } from "./useAnchorProgram";

export function useChain() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { program } = useAnchorProgram();

  return {
    program,
    owner: wallet.publicKey ?? null,
    connection,
    wallet,
  };
}
