import React, { createContext, useContext, useEffect, useState } from "react";

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: null,
});

// NetInfo module - may not be installed
let NetInfo: any = null;
try {
  NetInfo = require("@react-native-community/netinfo");
} catch {
  // NetInfo not installed
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (!NetInfo) {
      console.log(
        "[NetworkContext] NetInfo not available, defaulting to online",
      );
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const state = await NetInfo.fetch();
        if (isMounted) {
          setIsConnected(state.isConnected ?? true);
          setIsInternetReachable(state.isInternetReachable ?? null);
        }
      } catch {
        if (isMounted) {
          console.log(
            "[NetworkContext] NetInfo fetch failed, defaulting to online",
          );
        }
      }
    };

    init();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      if (isMounted) {
        setIsConnected(state.isConnected ?? true);
        setIsInternetReachable(state.isInternetReachable ?? null);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  return useContext(NetworkContext);
}
