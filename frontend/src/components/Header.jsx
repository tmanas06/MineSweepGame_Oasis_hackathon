import { useWallet } from "../contexts/WalletContext";
import { Button } from "./ui/button";
import { formatEther } from "ethers";
import { useState, useEffect } from "react";

export function Header() {
  const { account, provider, rawProvider, isConnected, disconnectWallet, switchToOasisNetwork } = useWallet();
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    const fetchBalance = async () => {
      if (rawProvider && account) {
        try {
          console.log("Fetching balance for account:", account);
          console.log("Using rawProvider:", rawProvider);
          
          const balanceBigInt = await rawProvider.getBalance(account);
          console.log("Raw balance (BigInt):", balanceBigInt.toString());
          
          const balance = formatEther(balanceBigInt);
          console.log("Formatted balance:", balance);
          
          setBalance(parseFloat(balance).toFixed(4));
        } catch (error) {
          console.error("Error fetching balance:", error);
          // Try using window.ethereum directly as fallback
          try {
            console.log("Trying fallback balance fetch...");
            const balanceHex = await window.ethereum.request({
              method: 'eth_getBalance',
              params: [account, 'latest']
            });
            console.log("Fallback balance (hex):", balanceHex);
            const balanceBigInt = BigInt(balanceHex);
            const balance = formatEther(balanceBigInt);
            console.log("Fallback formatted balance:", balance);
            setBalance(parseFloat(balance).toFixed(4));
          } catch (fallbackError) {
            console.error("Fallback balance fetch failed:", fallbackError);
          }
        }
      }
    };

    fetchBalance();
  }, [rawProvider, account]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-6 glass border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">💎</span>
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold gradient-text">
          MinePlay
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="flex items-center gap-4">
            <div className="text-right glass rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-white">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ""}
              </p>
              <p className="text-xs text-cyan-200">
                {balance} Oasis Sapphire Testnet Token
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={switchToOasisNetwork} 
                variant="outline" 
                size="sm"
                className="glass border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 px-4 py-2 rounded-lg"
              >
                Switch Network
              </Button>
              <Button 
                onClick={disconnectWallet} 
                variant="outline" 
                size="sm"
                className="glass border-red-400/50 text-red-400 hover:bg-red-400/10 px-4 py-2 rounded-lg"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60 glass rounded-lg px-4 py-2">Not connected</p>
        )}
      </div>
    </header>
  );
}
