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
    <header className="static top-0 flex items-center justify-between border-b p-4 bg-background/75 backdrop-blur-sm hover:shadow-sm transition-shadow">
      <p className="text-xl md:text-2xl lg:text-3xl font-semibold">
        Oasis Minesweeper
      </p>
      
      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {balance} Oasis Sapphire Testnet Token
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={switchToOasisNetwork} 
                variant="outline" 
                size="sm"
              >
                Switch Network
              </Button>
              <Button 
                onClick={disconnectWallet} 
                variant="outline" 
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not connected</p>
        )}
      </div>
    </header>
  );
}
