import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Analytics } from "@vercel/analytics/react";
import { WalletProvider } from "./contexts/WalletContext.jsx";
import "./index.css";
import { Toaster } from "./components/ui/sonner.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WalletProvider>
      <App />
      <Analytics />
      <Toaster />
    </WalletProvider>
  </StrictMode>,
);
