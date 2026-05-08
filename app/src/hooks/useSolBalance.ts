import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }
    connection.getBalance(publicKey).then((b) => setBalance(b / LAMPORTS_PER_SOL));
  }, [connection, publicKey]);

  return balance;
}
