/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { Contract, ethers, formatEther, parseEther } from "ethers";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CountdownTimer from "./components/CountdownTimer";
import GameBoard from "./components/GameBoard";
import { Header } from "./components/Header";
import { StartGame } from "./components/StartGame";
import TestFaucet from "./components/TestFaucet";
import { Contract_ABI, Contract_address } from "./constants";
import { cn } from "./lib/utils";
import PropTypes from "prop-types";
import { Button } from "./components/ui/button";
import { useWallet } from "./contexts/WalletContext";

function App() {
  const [balance, setBalance] = useState("");
  const [readContract, setReadContract] = useState(null);
  const [writeContract, setWriteContract] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [selectedCellsDisplay, setSelectedCellsDisplay] = useState("");
  const [sessionGameActive, setSessionGameActive] = useState(false);
  const [sessionWinnings, setSessionWinnings] = useState("");
  const [sessionSafeMoves, setSessionSafeMoves] = useState("");
  const [sessionSelectedMoves, setSessionSelectedMoves] = useState([]);
  const [sessionRemainingTime, setSessionRemainingTime] = useState(0);
  const [allSelectedCells, setAllSelectedCells] = useState([]);
  const [auth, setAuth] = useState(null);

  const CONTRACT_ADDRESS = Contract_address;
  const CONTRACT_ABI = Contract_ABI;

  const { 
    account, 
    provider, 
    rawProvider,
    signer, 
    isConnected, 
    isConnecting, 
    connectWallet, 
    disconnectWallet,
    switchToOasisNetwork,
    refreshProviders,
    isMetaMaskInstalled 
  } = useWallet();

  const walletConnected = isConnected;

  // Event handler functions
  const handleGameStarted = (player, betAmount) => {
    toast.success(`Game started with bet: ${formatEther(betAmount)} Oasis Sapphire Testnet Token`);
  };

  const handlePlayerHitMine = (player, lostAmount) => {
    toast.error(`Hit a mine! Lost: ${formatEther(lostAmount)} Oasis Sapphire Testnet Token`);
  };

  const handleGameCashOut = (player, winnings) => {
    toast.success(`Cashed out: ${formatEther(winnings)} Oasis Sapphire Testnet Token`);
  };

  const handleWinningsWithdrawn = (player, amount) => {
    toast.success(`Withdrawn: ${formatEther(amount)} Oasis Sapphire Testnet Token`);
  };

  useEffect(() => {
    const init = async () => {
      if (provider && signer && account) {
        try {
          // Initialize read-only contract instance
          const readContractInstance = new Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            provider,
          );
          setReadContract(readContractInstance);

          // Initialize write contract instance
          const writeContractInstance = new Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer,
          );
          setWriteContract(writeContractInstance);

          // Check for existing auth
          const existingAuth = localStorage.getItem("auth");
          if (existingAuth) {
            const parsedAuth = JSON.parse(existingAuth);
            if (isAuthValid(parsedAuth)) {
              setAuth(parsedAuth);
            } else {
              // If auth is invalid, remove it and proceed with sign-in
              localStorage.removeItem("auth");
              await signIn(signer, account);
            }
          } else {
            await signIn(signer, account);
          }

          // Fetch balance
          console.log("App - Fetching balance for account:", account);
          console.log("App - Using rawProvider:", rawProvider);
          
          const balanceBigInt = await rawProvider.getBalance(account);
          console.log("App - Raw balance (BigInt):", balanceBigInt.toString());
          
          const balance = formatEther(balanceBigInt);
          console.log("App - Formatted balance:", balance);
          
          setBalance(balance);

          // Fetch initial game state
          fetchGameState();
        } catch (error) {
          console.error("Error initializing provider and signer", error);
        }
      }
    };
    init();
  }, [provider, signer, account]);

  useEffect(() => {
    if (readContract) {
      // Attach event listeners
      readContract.on("GameStarted", handleGameStarted);
      readContract.on("PlayerHitMine", handlePlayerHitMine);
      readContract.on("GameCashOut", handleGameCashOut);
      readContract.on("WinningsWithdrawn", handleWinningsWithdrawn);

      // Cleanup function to remove listeners
      return () => {
        readContract.off("GameStarted", handleGameStarted);
        readContract.off("PlayerHitMine", handlePlayerHitMine);
        readContract.off("GameCashOut", handleGameCashOut);
        readContract.off("WinningsWithdrawn", handleWinningsWithdrawn);
      };
    }
  }, [readContract]);

  const promiseToast = (
    promise,
    loadingMessage,
    successMessage,
    errorMessage,
  ) => {
    const toastId = toast.loading(loadingMessage, { duration: Infinity });

    promise
      .then(() => {
        toast.success(successMessage, { id: toastId, duration: 3000 });
      })
      .catch((error) => {
        toast.error(errorMessage, { id: toastId, duration: 3000 });
        console.error(error);
      });

    return promise;
  };

  const fetchGameState = async () => {
    if (readContract && auth) {
      try {
        const gameState = await readContract.getGameState(auth);
        // console.log("GameState:", gameState);

        const [isActive, winnings, safeMoves, remainingTime, selectedMoves] =
          gameState;

        setSessionGameActive(isActive);
        setSessionWinnings(formatEther(winnings));
        setSessionSafeMoves(safeMoves.toString());
        setSessionRemainingTime(Number(remainingTime.toString()));
        setSessionSelectedMoves(
          selectedMoves.map((move) => Number(move.toString())),
        );
      } catch (error) {
        console.error("Error fetching game state:", error);
        handleError(error);
      }
    }
  };

  const handleTimeUp = () => {
    toast.error("Time's up! The game session has ended.");
    fetchGameState();
  };

  useEffect(() => {
    if (walletConnected && readContract) {
      fetchGameState();
      setAllSelectedCells([]); // Reset all selected cells when starting a new game
    }
  }, [walletConnected, readContract]);

  const handleStartGame = async () => {
    try {
      // Refresh providers to ensure they're for the current network
      console.log("Refreshing providers before starting game...");
      const refreshedProviders = await refreshProviders();
      
      if (!refreshedProviders) {
        toast.error("Unable to refresh wallet connection. Please try again.");
        return;
      }

      const { provider: freshProvider, rawProvider: freshRawProvider, signer: freshSigner } = refreshedProviders;

      // Recreate contract with fresh signer
      const freshWriteContract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        freshSigner,
      );

      // Check balance first
      console.log("handleStartGame - Checking balance for account:", account);
      console.log("handleStartGame - Using freshRawProvider:", freshRawProvider);
      
      const balance = await freshRawProvider.getBalance(account);
      console.log("handleStartGame - Raw balance (BigInt):", balance.toString());
      
      const requiredAmount = parseEther("1");
      console.log("handleStartGame - Required amount (BigInt):", requiredAmount.toString());
      console.log("handleStartGame - Balance >= Required:", balance >= requiredAmount);
      
      if (balance < requiredAmount) {
        toast.error("Insufficient Oasis Sapphire Testnet Tokens! You need at least 1 token to start a game. Use the faucet to get test tokens.");
        return;
      }

      await promiseToast(
        freshWriteContract
          .startGame({ value: parseEther("1") })
          .then((tx) => tx.wait()),
        "Starting game...",
        "Game started successfully!",
        "Failed to start game. Please try again.",
      );
      fetchGameState();
    } catch (error) {
      console.error("Error starting game:", error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error("Insufficient Oasis Sapphire Testnet Tokens! You need at least 1 token to start a game. Use the faucet to get test tokens.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please ensure you're on the Oasis Sapphire Testnet and try again.");
      } else {
        handleError(error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const newSelectedCells = selectedCells.filter(
        (cell) => !allSelectedCells.includes(cell),
      );
      const sortedCells = newSelectedCells.sort((a, b) => a - b);
      setSelectedCellsDisplay(sortedCells.map((cell) => cell + 1).join(", "));

      if (writeContract && newSelectedCells.length > 0) {
        await promiseToast(
          writeContract.makeMoves(sortedCells).then((tx) => tx.wait()),
          "Submitting moves...",
          "Moves submitted successfully!",
          "Failed to submit moves. Please try again.",
        );
        setAllSelectedCells((prev) => [...prev, ...newSelectedCells]);
        setSessionSelectedMoves((prev) => [...prev, ...newSelectedCells]);
        setSelectedCells([]);
        console.log("Moves submitted:", sortedCells);
        fetchGameState();
      } else if (newSelectedCells.length === 0) {
        toast.error("No new cells selected", { duration: 3000 });
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleCellClick = (cellNumber) => {
    if (!allSelectedCells.includes(cellNumber)) {
      setSelectedCells((prevSelected) => {
        if (prevSelected.includes(cellNumber)) {
          return prevSelected.filter((cell) => cell !== cellNumber);
        } else {
          return [...prevSelected, cellNumber];
        }
      });
    }
  };

  const handleRestartGame = async () => {
    setSelectedCells([]);
    setSelectedCellsDisplay("");
    setSessionGameActive(false);
    setSessionWinnings("");
    setSessionSafeMoves("");
    setSessionSelectedMoves([]);
    setSessionRemainingTime(0);
    setAllSelectedCells([]);
    toast.success("Game restarted. Start a new game session!");
  };

  useEffect(() => {
    if (!sessionGameActive) {
      setAllSelectedCells([]);
    }
  }, [sessionGameActive]);

  const handleCashout = async () => {
    try {
      if (writeContract) {
        await promiseToast(
          writeContract.cashOut().then((tx) => tx.wait()),
          "Cashing out...",
          "Cashed out successfully!",
          "Failed to cash out. Please try again.",
        );
        fetchGameState();
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleWithdraw = async () => {
    try {
      if (writeContract) {
        try {
          // Perform a static call to simulate the transaction
          await writeContract.withdraw.staticCall();

          // Proceed with sending the transaction
          await promiseToast(
            writeContract.withdraw().then((tx) => tx.wait()),
            "Withdrawing...",
            "Withdrawn successfully!",
            "No balance available to withdraw",
          );
          fetchGameState();
        } catch (error) {
          toast.error("You don't have any balance to withdraw");
        }
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error) => {
    console.error("Error:", error);
    if (error.data) {
      toast.error(`Transaction failed: ${error.data.message}`);
    } else if (error.message) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.error("An unknown error occurred");
    }
  };

  // Add checkAuth function
  const checkAuth = async () => {
    console.log("Checking auth...");
    const storedAuthStr = localStorage.getItem("auth");
    let storedAuth = null;

    if (storedAuthStr) {
      storedAuth = JSON.parse(storedAuthStr);
      console.log("Stored auth found:", storedAuth);
    } else {
      console.log("No stored auth found");
    }

    const currentTime = Math.floor(new Date().getTime() / 1000);

    if (storedAuth && storedAuth.time && storedAuth.user && storedAuth.rsv) {
      // Check if auth is still valid (within last 24 hours)
      if (storedAuth.time > currentTime - 60 * 60 * 24) {
        // time in seconds
        console.log("Auth is still valid");
        setAuth(storedAuth);
        return;
      } else {
        console.log("Auth has expired");
      }
    }

    // If no valid auth, perform sign-in
    console.log("Performing sign-in");
    await signIn();
  };

  const isAuthValid = (auth) => {
    const currentTime = Math.floor(Date.now() / 1000);
    return auth && auth.time && currentTime - auth.time < 24 * 60 * 60; // Valid for 24 hours
  };

  const signIn = async (signer, userAddress) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const user = userAddress;
      console.log(user);

      const signature = await signer.signTypedData(
        {
          name: "SignInExample.SignIn",
          version: "1",
          chainId: 23295,
          verifyingContract: CONTRACT_ADDRESS,
        },
        {
          SignIn: [
            { name: "user", type: "address" },
            { name: "time", type: "uint32" },
          ],
        },
        {
          user,
          time: currentTime,
        },
      );
      const rsv = ethers.Signature.from(signature);
      const auth = { user, time: currentTime, rsv };

      setAuth(auth);
      localStorage.setItem("auth", JSON.stringify(auth));

      // Reinitialize contract with authenticated signer
      const contractInstance = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer,
      );
      setWriteContract(contractInstance);
      window.location.reload();
    } catch (error) {
      console.error("Error during sign-in:", error);
      toast.error("Sign-in failed. Please try again.");
    }
  };

  useEffect(() => {
    if (isConnected && signer) {
      checkAuth();
    }
  }, [isConnected, signer]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <div className="container py-8 mx-auto md:py-12 space-y-6 px-4">
        {!walletConnected ?
          <Unauthenticated />
        : <div className="space-y-8">
            <TestFaucet />
            <GameRules />

            {sessionRemainingTime == 0 ?
              <div className="text-center">
                <p className="mb-4">Start a new game session to play!</p>
                <StartGame onStart={handleStartGame} />
              </div>
            : <>
                <div className="rounded-lg p-6 border">
                  <h2 className="text-2xl font-semibold mb-4">Game Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Winnings</p>
                      <p className="text-xl font-bold">
                        {sessionWinnings} Oasis Sapphire Testnet Token
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Safe Moves</p>
                      <p className="text-xl font-bold">{sessionSafeMoves}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining Time</p>
                      <p className="text-xl font-bold">
                        <CountdownTimer
                          initialTime={sessionRemainingTime}
                          onTimeUp={handleTimeUp}
                        />
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button variant="destructive" onClick={handleRestartGame}>
                        Restart Game
                      </Button>
                    </div>
                  </div>
                </div>
                <GameBoard
                  onCellClick={handleCellClick}
                  selectedCells={selectedCells}
                  sessionSelectedMoves={sessionSelectedMoves}
                />
                <div className="flex justify-center gap-4 mt-4 max-w-xs *:w-full mx-auto">
                  <Button variant="outline" onClick={handleSubmit}>
                    Submit Moves
                  </Button>
                  <Button variant="outline" onClick={handleCashout}>
                    Cashout Session
                  </Button>
                </div>
              </>
            }

            <div className="mt-8 text-center">
              <Button onClick={handleWithdraw}>Withdraw to Account</Button>
            </div>
          </div>
        }
      </div>
    </div>
  );
}

export default App;

function Unauthenticated() {
  const { connectWallet, isConnecting, isMetaMaskInstalled, switchToOasisNetwork } = useWallet();

  return (
    <div className="space-y-8 flex flex-col items-center w-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 md:text-4xl lg:text-5xl gradient-text">
          Welcome to MinePlay
        </h1>
        <p className="mb-4 md:text-lg lg:text-xl text-white/80">
          Connect your MetaMask wallet to start playing!
        </p>
        
        <div className="flex flex-col gap-4 items-center">
          {!isMetaMaskInstalled() ? (
            <div className="text-center p-6 glass rounded-xl border border-yellow-400/30">
              <p className="text-yellow-200 mb-2 font-semibold">MetaMask is not installed</p>
              <p className="text-sm text-yellow-100 mb-4">
                Please install MetaMask browser extension to continue
              </p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg"
              >
                Install MetaMask
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button 
                onClick={connectWallet} 
                disabled={isConnecting}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg"
              >
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </Button>
              <Button 
                onClick={switchToOasisNetwork} 
                variant="outline"
                size="lg"
                className="min-w-[200px] glass border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 px-6 py-3 rounded-xl"
              >
                Switch to Oasis Network
              </Button>
            </div>
          )}
        </div>
      </div>

      <GameRules className="max-w-3xl" />
    </div>
  );
}

function GameRules({ className }) {
  return (
    <div
      className={cn("glass rounded-xl border border-white/20 w-full p-6", className)}
    >
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text">
          Game Rules
        </h2>

        <div className="grid gap-4">
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">1.</span>
            <p className="text-white/90">The game is played on a 5x5 grid with 5 hidden mines.</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">2.</span>
            <p className="text-white/90">Click on cells to select them. Submit Moves to validate</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">3.</span>
            <p className="text-white/90">Each safe move increases your potential winnings.</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">4.</span>
            <p className="text-white/90">Cash out anytime to secure your winnings.</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">5.</span>
            <p className="text-white/90">Hit a mine, and you lose your bet.</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg">
            <span className="text-cyan-400 font-bold text-lg">6.</span>
            <p className="text-white/90">You have 3 minutes to complete the game.</p>
          </div>
          <div className="flex items-start gap-3 p-3 glass rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-400/30">
            <span className="text-purple-400 font-bold text-lg">💰</span>
            <p className="text-white font-semibold">Entry fee: 1 Oasis Sapphire Testnet Token</p>
          </div>
        </div>
      </div>
    </div>
  );
}

GameRules.propTypes = {
  className: PropTypes.string,
};
