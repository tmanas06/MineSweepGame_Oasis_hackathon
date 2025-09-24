import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as sapphire from '@oasisprotocol/sapphire-paratime';
import { toast } from 'sonner';

const WalletContext = createContext();

// Oasis Sapphire Testnet configuration
const OASIS_CHAIN_ID = '0x5aff'; // 23295 in hex (correct format)
const OASIS_CHAIN_CONFIG = {
  chainId: OASIS_CHAIN_ID,
  chainName: 'Oasis Sapphire Testnet',
  nativeCurrency: {
    name: 'Oasis Sapphire Testnet Token',
    symbol: 'TEST',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.sapphire.oasis.io'],
  blockExplorerUrls: ['https://explorer.oasis.io/testnet/sapphire'],
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [rawProvider, setRawProvider] = useState(null); // For balance reading
  const [chainId, setChainId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  };

  // Request account access
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const account = accounts[0];
        setAccount(account);
        setIsConnected(true);

        // Create provider and signer
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        console.log("Created web3Provider:", web3Provider);
        
        const wrappedProvider = sapphire.wrap(web3Provider);
        console.log("Created wrappedProvider:", wrappedProvider);
        
        const web3Signer = await wrappedProvider.getSigner();
        console.log("Created web3Signer:", web3Signer);

        setProvider(wrappedProvider);
        setRawProvider(web3Provider); // Store raw provider for balance reading
        setSigner(web3Signer);

        // Check current chain
        const network = await wrappedProvider.getNetwork();
        setChainId(`0x${network.chainId.toString(16)}`);

        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to Oasis Sapphire Testnet
  const switchToOasisNetwork = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed.');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: OASIS_CHAIN_ID }],
      });
    } catch (switchError) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [OASIS_CHAIN_CONFIG],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          toast.error('Failed to add Oasis Sapphire Testnet to MetaMask.');
        }
      } else {
        console.error('Error switching network:', switchError);
        toast.error('Failed to switch to Oasis Sapphire Testnet.');
      }
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount('');
    setProvider(null);
    setRawProvider(null);
    setSigner(null);
    setChainId('');
    setIsConnected(false);
    localStorage.removeItem('auth');
    toast.success('Wallet disconnected');
  };

  // Refresh providers (useful when network changes)
  const refreshProviders = async () => {
    if (isConnected && account && isMetaMaskInstalled()) {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const wrappedProvider = sapphire.wrap(web3Provider);
        const web3Signer = await wrappedProvider.getSigner();

        setProvider(wrappedProvider);
        setRawProvider(web3Provider);
        setSigner(web3Signer);
        
        console.log("Providers refreshed");
        return { provider: wrappedProvider, rawProvider: web3Provider, signer: web3Signer };
      } catch (error) {
        console.error("Error refreshing providers:", error);
        throw error;
      }
    }
    return null;
  };

  // Handle account changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          // Account changed, reconnect
          connectWallet();
        }
      };

      const handleChainChanged = async (chainId) => {
        console.log("Chain changed to:", chainId);
        setChainId(chainId);
        
        // Recreate providers when chain changes
        if (isConnected && account) {
          try {
            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const wrappedProvider = sapphire.wrap(web3Provider);
            const web3Signer = await wrappedProvider.getSigner();

            setProvider(wrappedProvider);
            setRawProvider(web3Provider);
            setSigner(web3Signer);
            
            console.log("Providers recreated for new network");
          } catch (error) {
            console.error("Error recreating providers on chain change:", error);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  // Check if already connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskInstalled()) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            const account = accounts[0];
            setAccount(account);
            setIsConnected(true);

            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            console.log("CheckConnection - Created web3Provider:", web3Provider);
            
            const wrappedProvider = sapphire.wrap(web3Provider);
            console.log("CheckConnection - Created wrappedProvider:", wrappedProvider);
            
            const web3Signer = await wrappedProvider.getSigner();
            console.log("CheckConnection - Created web3Signer:", web3Signer);

            setProvider(wrappedProvider);
            setRawProvider(web3Provider); // Store raw provider for balance reading
            setSigner(web3Signer);

            const network = await wrappedProvider.getNetwork();
            setChainId(`0x${network.chainId.toString(16)}`);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  const value = {
    account,
    provider,
    signer,
    rawProvider,
    chainId,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchToOasisNetwork,
    refreshProviders,
    isMetaMaskInstalled,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
