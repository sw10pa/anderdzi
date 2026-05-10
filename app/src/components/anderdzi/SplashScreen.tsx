import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export type SplashPhase = "spin" | "reveal" | "settle" | "done";

export function useSplash() {
  const { connected, connecting } = useWallet();
  const skip = connected || connecting;
  const [phase, setPhase] = useState<SplashPhase>(skip ? "done" : "spin");

  useEffect(() => {
    if (skip) {
      setPhase("done");
      return;
    }
    const t1 = setTimeout(() => setPhase("reveal"), 2500);
    const t2 = setTimeout(() => setPhase("settle"), 3200);
    const t3 = setTimeout(() => setPhase("done"), 3900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [skip]);

  return phase;
}
