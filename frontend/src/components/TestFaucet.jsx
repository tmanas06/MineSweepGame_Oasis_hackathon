import { ExternalLinkIcon } from "@heroicons/react/outline";
import { useWallet } from "../contexts/WalletContext";
import { Button } from "./ui/button";

const TestFaucet = () => {
  const { account, isConnected } = useWallet();

  const handleFaucetClick = () => {
    if (!isConnected || !account) {
      alert("Please connect your wallet first!");
      return;
    }
    
    // Copy wallet address to clipboard
    navigator.clipboard.writeText(account);
    alert("Wallet address copied to clipboard! Paste it in the faucet.");
    
    // Open faucet in new tab
    window.open("https://faucet.testnet.oasis.dev/", "_blank");
  };

  return (
    <div className="text-center glass rounded-2xl p-8 border border-cyan-400/20">
      <div className="text-4xl mb-4">💧</div>
      
      <h3 className="text-2xl font-bold mb-4 gradient-text">
        Need Oasis Sapphire Testnet Tokens?
      </h3>
      
      <p className="text-white/80 mb-6 text-lg">
        You need Oasis Sapphire Testnet tokens to play the game. Get 10 tokens from the faucet:
      </p>
      
      {isConnected && account ? (
        <div className="space-y-4">
          <div className="text-sm text-cyan-200 glass p-3 rounded-xl">
            <span className="font-medium">Wallet:</span> {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          
          <Button 
            onClick={handleFaucetClick}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg"
          >
            Get Oasis Sapphire Testnet Tokens from Faucet
            <ExternalLinkIcon className="h-5 w-5 ml-2" />
          </Button>
          
          <div className="text-sm text-white/60 glass p-3 rounded-lg">
            <p className="font-medium mb-1">Instructions:</p>
            <p>1. Select "Sapphire" from the dropdown</p>
            <p>2. Paste your address</p>
            <p>3. Complete CAPTCHA</p>
          </div>
        </div>
      ) : (
        <p className="text-white/60 glass rounded-xl p-4">
          Connect your wallet first to get your address for the faucet
        </p>
      )}
    </div>
  );
};

export default TestFaucet;
