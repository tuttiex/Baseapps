import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home.jsx'
import AllDapps from './AllDapps.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

// Web3 Imports
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: 'BaseApps',
  projectId: 'YOUR_PROJECT_ID', // TODO: Get a real ID from WalletConnect Cloud
  chains: [base],
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme({
            accentColor: '#7b3fe4', // Purple
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/all-dapps" element={<AllDapps />} />
              </Routes>
            </BrowserRouter>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
