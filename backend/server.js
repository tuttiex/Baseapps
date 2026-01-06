const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://baseapps-nine.vercel.app',
      'https://baseapps.org'
    ];
    
    // Check if origin is in allowed list or is a vercel.app subdomain
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Base network RPC endpoint
const BASE_RPC_URL = 'https://mainnet.base.org';

// Cache file path for storing dapps locally
const CACHE_FILE_PATH = path.join(__dirname, 'dapps-cache.json');

// Dapps data source - using multiple sources for comprehensive data
const DAPPS_DATA_SOURCES = {
  // You can add more sources here
  baseDapps: [
    {
      name: "Uniswap V3",
      description: "Decentralized exchange on Base",
      category: "DeFi",
      url: "https://app.uniswap.org",
      logo: "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png",
      tvl: "High",
      chain: "Base"
    },
    {
      name: "Aave",
      description: "Lending and borrowing protocol",
      category: "DeFi",
      url: "https://app.aave.com",
      logo: "https://assets.coingecko.com/coins/images/12645/small/aave.png",
      tvl: "High",
      chain: "Base"
    },
    {
      name: "Friend.tech",
      description: "Social token platform",
      category: "Social",
      url: "https://friend.tech",
      logo: "https://pbs.twimg.com/profile_images/1693149782003200000/5qJYqJqL_400x400.jpg",
      tvl: "Medium",
      chain: "Base"
    },
    {
      name: "BaseSwap",
      description: "AMM DEX on Base",
      category: "DeFi",
      url: "https://baseswap.fi",
      logo: "https://baseswap.fi/favicon.ico",
      tvl: "Medium",
      chain: "Base"
    },
    {
      name: "Aerodrome",
      description: "Base-native AMM",
      category: "DeFi",
      url: "https://aerodrome.finance",
      logo: "https://aerodrome.finance/favicon.ico",
      tvl: "High",
      chain: "Base"
    },
    {
      name: "Moonwell",
      description: "Lending protocol",
      category: "DeFi",
      url: "https://moonwell.fi",
      logo: "https://moonwell.fi/favicon.ico",
      tvl: "Medium",
      chain: "Base"
    },
    {
      name: "Stargate",
      description: "Cross-chain bridge",
      category: "Bridge",
      url: "https://stargate.finance",
      logo: "https://stargate.finance/favicon.ico",
      tvl: "High",
      chain: "Base"
    },
    {
      name: "LayerZero",
      description: "Omnichain interoperability protocol",
      category: "Infrastructure",
      url: "https://layerzero.network",
      logo: "https://layerzero.network/favicon.ico",
      tvl: "High",
      chain: "Base"
    }
    // Add more dapps here - just copy the format above and fill in your dapp's info
  ]
};

// NOTE: DappRadar API shut down in November 2025 - this function is disabled
// Fetch dapps from DappRadar API (DISABLED - DappRadar shut down Nov 2025)
async function fetchDappsFromDappRadar() {
  try {
    // DappRadar API endpoint - may require API key
    // You can get a free API key from https://dappradar.com/api
    // Add it to your .env file as: DAPPRADAR_API_KEY=your_key_here
    const apiKey = process.env.DAPPRADAR_API_KEY || '';
    const headers = apiKey ? { 'X-BLOBR-KEY': apiKey } : {};
    
    // Try multiple DappRadar API endpoints
    const endpoints = [
      {
        url: 'https://api.dappradar.com/v2/dapps',
        params: { chain: 'base', page: 1, resultsPerPage: 100 }
      },
      {
        url: 'https://api.dappradar.com/v2/dapps/base',
        params: { page: 1, resultsPerPage: 100 }
      },
      {
        url: 'https://api.dappradar.com/v2/dapps',
        params: { blockchain: 'base', page: 1, resultsPerPage: 100 }
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers,
          params: endpoint.params,
          timeout: 10000  // Increased timeout to 10 seconds
        });
        
        // Handle different response structures
        let dapps = [];
        if (response.data?.results) {
          dapps = response.data.results;
        } else if (Array.isArray(response.data)) {
          dapps = response.data;
        } else if (response.data?.data) {
          dapps = Array.isArray(response.data.data) ? response.data.data : [];
        }
        
        // Filter for Base network if not already filtered
        const baseDapps = dapps.filter(dapp => {
          if (!dapp) return false;
          const chains = dapp.chains || dapp.blockchains || dapp.chain || [];
          const chainArray = Array.isArray(chains) ? chains : [chains];
          return chainArray.some(chain => 
            chain && chain.toString().toLowerCase().includes('base')
          );
        });
        
        if (baseDapps.length > 0) {
          const dappRadarDapps = baseDapps.map(dapp => ({
            name: dapp.name || dapp.title || 'Unknown',
            description: dapp.description || dapp.shortDescription || `${dapp.name || dapp.title} on Base`,
            category: dapp.category || dapp.categories?.[0] || dapp.type || "DeFi",
            url: dapp.website || dapp.url || dapp.link || `https://${(dapp.name || dapp.title || '').toLowerCase().replace(/\s+/g, '')}.com`,
            logo: dapp.logo || dapp.image || dapp.icon || "",
            tvl: dapp.volume24h ? `$${(dapp.volume24h / 1e6).toFixed(2)}M` : 
                 dapp.users24h ? `${(dapp.users24h / 1000).toFixed(1)}K users` : 
                 dapp.volume7d ? `$${(dapp.volume7d / 1e6).toFixed(2)}M (7d)` : "N/A",
            chain: "Base"
          }));
          
          return dappRadarDapps;
        }
      } catch (endpointError) {
        // Try next endpoint
        continue;
      }
    }
  } catch (error) {
    // If API key is required or endpoint fails
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('DappRadar API requires authentication. Get a free API key from https://dappradar.com/api and add DAPPRADAR_API_KEY to .env file');
    } else {
      console.log('Error fetching from DappRadar:', error.message);
    }
  }
  
  return [];
}

// Save dapps to cache file
async function saveDappsToCache(dapps) {
  try {
    const cacheData = {
      timestamp: new Date().toISOString(),
      dapps: dapps
    };
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log(`💾 Cached ${dapps.length} dapps to local file`);
  } catch (error) {
    console.log('Error saving cache:', error.message);
  }
}

// Load dapps from cache file
async function loadDappsFromCache() {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf8');
    const cacheData = JSON.parse(data);
    console.log(`📂 Loaded ${cacheData.dapps.length} dapps from cache (last updated: ${cacheData.timestamp})`);
    return cacheData.dapps;
  } catch (error) {
    // Cache file doesn't exist or is invalid - that's okay
    console.log('No cache file found or cache is invalid');
    return [];
  }
}

// Fetch dapps from DefiLlama API
async function fetchDappsFromDefiLlama(useCache = true) {
  try {
    const response = await axios.get('https://api.llama.fi/protocols', {
      timeout: 10000  // Increased timeout to 10 seconds
    });
    
    if (response.data) {
      const baseProtocols = response.data
        .filter(protocol => 
          protocol.chains && 
          protocol.chains.some(chain => 
            chain.toLowerCase().includes('base')
          )
        )
        .map(protocol => ({
          name: protocol.name,
          description: protocol.description || `${protocol.name} on Base`,
          category: protocol.category || "DeFi",
          url: protocol.url || `https://${protocol.name.toLowerCase()}.com`,
          logo: protocol.logo || "",
          tvl: protocol.tvl ? `$${(protocol.tvl / 1e9).toFixed(2)}B` : "N/A",
          chain: "Base"
        }));
      
      // Save to cache if we got data
      if (useCache && baseProtocols.length > 0) {
        await saveDappsToCache(baseProtocols);
      }
      
      return baseProtocols;
    }
  } catch (error) {
    console.log('Error fetching from DefiLlama:', error.message);
    
    // If API fails and we want to use cache, try loading from cache
    if (useCache) {
      console.log('Attempting to load from cache...');
      const cachedDapps = await loadDappsFromCache();
      if (cachedDapps.length > 0) {
        return cachedDapps;
      }
    }
  }
  
  return [];
}

// Fetch dapps from CoinGecko API (alternative to DappRadar)
async function fetchDappsFromCoinGecko() {
  try {
    // CoinGecko API for Base ecosystem
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        category: 'base-ecosystem',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1
      },
      timeout: 10000
    });
    
    if (response.data && Array.isArray(response.data)) {
      const coinGeckoDapps = response.data
        .filter(coin => coin.platforms && Object.keys(coin.platforms).some(p => p.toLowerCase().includes('base')))
        .map(coin => ({
          name: coin.name,
          description: `Cryptocurrency on Base network`,
          category: "DeFi",
          url: coin.links?.homepage?.[0] || `https://www.coingecko.com/en/coins/${coin.id}`,
          logo: coin.image || "",
          tvl: coin.market_cap ? `$${(coin.market_cap / 1e9).toFixed(2)}B` : "N/A",
          chain: "Base"
        }));
      
      return coinGeckoDapps;
    }
  } catch (error) {
    console.log('Error fetching from CoinGecko:', error.message);
  }
  
  return [];
}

// Fetch dapps from external APIs
// Note: DappRadar shut down in November 2025, so we're using DefiLlama and other sources
async function fetchDappsFromAPIs() {
  const allDapps = [];
  
  // Fetch from multiple APIs in parallel for faster response
  const [defiLlamaResult, coinGeckoResult] = await Promise.allSettled([
    fetchDappsFromDefiLlama(),
    fetchDappsFromCoinGecko()
  ]);
  
  // Add DefiLlama results if successful
  if (defiLlamaResult.status === 'fulfilled' && defiLlamaResult.value.length > 0) {
    allDapps.push(...defiLlamaResult.value);
    console.log(`✅ Fetched ${defiLlamaResult.value.length} dapps from DefiLlama`);
  } else {
    console.log('⚠️ DefiLlama API unavailable or returned no results');
  }
  
  // Add CoinGecko results if successful
  if (coinGeckoResult.status === 'fulfilled' && coinGeckoResult.value.length > 0) {
    allDapps.push(...coinGeckoResult.value);
    console.log(`✅ Fetched ${coinGeckoResult.value.length} dapps from CoinGecko`);
  }
  
  return allDapps;
}

// GET /api/dapps - Get all dapps
app.get('/api/dapps', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    // PRIORITY 1: Load from cache file first (contains 1,241 dapps)
    let allDapps = await loadDappsFromCache();
    
    // PRIORITY 2: If cache is empty, try fetching from external APIs
    if (allDapps.length === 0) {
      console.log('📡 Cache is empty, fetching from external APIs...');
      let externalDapps = [];
      try {
        externalDapps = await fetchDappsFromAPIs();
      } catch (error) {
        console.log('Using fallback dapps data');
      }
      
      // PRIORITY 3: Combine with fallback data if needed
      allDapps = [...externalDapps, ...DAPPS_DATA_SOURCES.baseDapps];
    }
    
    // Remove duplicates based on name (in case there are any)
    let uniqueDapps = Array.from(
      new Map(allDapps.map(dapp => [dapp.name.toLowerCase(), dapp])).values()
    );
    
    // Filter by category if provided
    if (category && category !== 'all') {
      uniqueDapps = uniqueDapps.filter(dapp => 
        dapp.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      uniqueDapps = uniqueDapps.filter(dapp =>
        dapp.name.toLowerCase().includes(searchLower) ||
        dapp.description.toLowerCase().includes(searchLower) ||
        dapp.category.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort alphabetically by name (A-Z)
    uniqueDapps.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
    res.json({
      success: true,
      count: uniqueDapps.length,
      dapps: uniqueDapps
    });
  } catch (error) {
    console.error('Error fetching dapps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dapps'
    });
  }
});

// GET /api/dapps/categories - Get all categories (organized hierarchically)
app.get('/api/dapps/categories', async (req, res) => {
  try {
    // Load all dapps from cache
    const allDapps = await loadDappsFromCache();
    
    // Extract unique minor categories
    const minorCategories = [...new Set(allDapps.map(dapp => dapp.category))];
    
    // Category hierarchy mapping
    const categoryHierarchy = {
      "DeFi": ["Dexs", "Lending & CDP", "Derivatives & Options", "Yield & Yield Strategies", 
               "RWA", "Stablecoins", "Prediction Market", "Portfolio", 
               "Liquid Staking", "Insurance"],
      "Infrastructure": ["Bridges", "Developer Tools", "Data & Analytics",
                         "Capital Allocators", "Liquidity Manager", "Launchpad",
                         "Security", "Identity", "Services", "Oracles"],
      "Consumer": ["Gaming", "NFTs", "Social & Entertainment", "Wallets", "Payments",
                   "Onramps", "Creator", "DAO", "Real World", "SoFi", "Privacy"],
      "AI": ["AI", "AI Agents"],
      "Trading": ["CEX", "Basis Trading", "Algo-Stables", "Risk Curators"]
    };
    
    // Organize categories into hierarchy
    const organized = {};
    const uncategorized = [];
    
    minorCategories.forEach(minor => {
      let found = false;
      for (const [major, subs] of Object.entries(categoryHierarchy)) {
        if (subs.includes(minor)) {
          if (!organized[major]) {
            organized[major] = [];
          }
          organized[major].push(minor);
          found = true;
          break;
        }
      }
      if (!found) {
        uncategorized.push(minor);
      }
    });
    
    // Add uncategorized to "Other" if any exist
    if (uncategorized.length > 0) {
      organized["Other"] = uncategorized;
    }
    
    res.json({
      success: true,
      categories: organized
    });
  } catch (error) {
    // Fallback to basic categories if cache fails
    const categories = [...new Set(DAPPS_DATA_SOURCES.baseDapps.map(dapp => dapp.category))];
    res.json({
      success: true,
      categories: { "All": categories.sort() }
    });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Base Dapps API is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`📂 Loading dapps from cache file: ${CACHE_FILE_PATH}`);
});
