import { useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useVaultStore } from "@/store/useVaultStore";

export function useWalletSync() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { connect, disconnect } = useVaultStore();

  useEffect(() => {
    if (connected && publicKey) {
      connect(publicKey, connection);
    } else {
      disconnect();
    }
  }, [connected, publicKey]);
}
