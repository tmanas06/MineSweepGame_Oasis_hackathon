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
    <div className="text-center border rounded-lg p-6 bg-blue-50 border-blue-200">
      <h3 className="text-lg font-semibold mb-3 text-blue-900">
        💧 Need Oasis Sapphire Testnet Tokens?
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        You need Oasis Sapphire Testnet tokens to play the game. Get 10 tokens from the faucet:
      </p>
      
      {isConnected && account ? (
        <div className="space-y-3">
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
            Wallet: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          <Button 
            onClick={handleFaucetClick}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Get Oasis Sapphire Testnet Tokens from Faucet
            <ExternalLinkIcon className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-blue-600">
            Instructions: Select "Sapphire" from the dropdown, paste your address, complete CAPTCHA
          </p>
        </div>
      ) : (
        <p className="text-sm text-blue-600">
          Connect your wallet first to get your address for the faucet
        </p>
      )}
    </div>
  );
};

export default TestFaucet;
