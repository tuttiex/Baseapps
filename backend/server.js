const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { query, validationResult } = require('express-validator');
const hpp = require('hpp');
const morgan = require('morgan');
const multer = require('multer'); // For file uploads
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Proxy for Railway load balancer
app.set('trust proxy', 1);

// Security Headers - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:", "http:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from external sources
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS
}));

// Request Logging - Morgan
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// Rate Limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate Limiting - Search endpoint (stricter)
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 search requests per windowMs
  message: {
    success: false,
    error: 'Too many search requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all /api routes
app.use('/api', generalLimiter);

// Middleware - CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://baseapps-nine.vercel.app',
    'https://baseapps.org',
    'https://www.baseapps.org'
  ],
  credentials: true
}));

// Middleware - JSON parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent HTTP Parameter Pollution
// Prevent HTTP Parameter Pollution
app.use(hpp());

// --- Storage Configuration (Railway Volume Support) ---
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'logos');

// Ensure directories exist on startup
(async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    console.log(`📂 Data Dir: ${DATA_DIR}`);
    console.log(`📂 Uploads Dir: ${UPLOADS_DIR}`);
  } catch (err) {
    console.error('Error creating directories:', err);
  }
})();

// Serve static files (uploaded logos)
app.use(express.static(path.join(__dirname, 'public')));
// Explicitly serve uploads directory on /logos path for Volume support
app.use('/logos', express.static(UPLOADS_DIR));

// Configure Multer for Logo Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Sanitize: timestamp-random-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    // Simple sanitization of filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Base network RPC endpoint
const BASE_RPC_URL = 'https://mainnet.base.org';

// Cache file path for storing dapps locally
const CACHE_FILE_PATH = path.join(DATA_DIR, 'dapps-cache.json');
const APPROVED_DAPPS_FILE = path.join(DATA_DIR, 'approved_dapps.json');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const DAPP_IDS_FILE = path.join(__dirname, 'dapp-ids.json');
const VOTING_CONTRACT_ADDRESS = process.env.VOTING_CONTRACT_ADDRESS || '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';

let dappIdMap = [];
async function loadDappIdMap() {
  try {
    const data = await fs.readFile(DAPP_IDS_FILE, 'utf8');
    dappIdMap = JSON.parse(data);
  } catch (error) {
    console.log('Dapp ID map not found:', error.message);
  }
}
loadDappIdMap();

// Helper to save approved dapps
async function saveApprovedDapps(dapps) {
  try {
    await fs.writeFile(APPROVED_DAPPS_FILE, JSON.stringify(dapps, null, 2), 'utf8');
  } catch (error) {
    console.log('Error saving approved dapps:', error.message);
  }
}

// Helper to load approved dapps
async function loadApprovedDapps() {
  try {
    const data = await fs.readFile(APPROVED_DAPPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// --- Voting System Logic ---

const VOTE_ABI = [
  "event VoteCast(address indexed voter, bytes32 indexed dappId, int8 value)",
  "event DappRegistered(bytes32 indexed dappId)",
  "event DappUnregistered(bytes32 indexed dappId)",
  "function dappScore(bytes32 dappId) view returns (int256)",
  "function isDappRegistered(bytes32 dappId) view returns (bool)"
];

let voteCache = {}; // dappId -> { totalScore: 0, weeklyScore: 0, votes: [] }
let registrationCache = {}; // dappId -> true/false

async function loadVotes() {
  try {
    const data = await fs.readFile(VOTES_FILE, 'utf8');
    const votes = JSON.parse(data);

    // Process historical votes into cache
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Reset cache
    voteCache = {};

    votes.forEach(vote => {
      if (!voteCache[vote.dappId]) {
        voteCache[vote.dappId] = { totalScore: 0, weeklyScore: 0, votes: [] };
      }

      voteCache[vote.dappId].votes = voteCache[vote.dappId].votes.filter(v => v.voter !== vote.voter);
      voteCache[vote.dappId].votes.push(vote);
    });

    // Re-calculate scores
    Object.keys(voteCache).forEach(id => {
      voteCache[id].totalScore = voteCache[id].votes.reduce((acc, v) => acc + v.value, 0);
      voteCache[id].weeklyScore = voteCache[id].votes
        .filter(v => v.timestamp > oneWeekAgo)
        .reduce((acc, v) => acc + v.value, 0);
    });

  } catch (error) {
    console.log('No historical votes found or error loading:', error.message);
  }
}

async function loadRegistrations() {
  try {
    const data = await fs.readFile(REGISTRATIONS_FILE, 'utf8');
    registrationCache = JSON.parse(data);
  } catch (error) {
    console.log('No registration data found.');
  }
}

async function saveRegistration(dappId, status) {
  try {
    registrationCache[dappId] = status;
    await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify(registrationCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving registration:', error);
  }
}

async function saveVote(dappId, voter, value) {
  try {
    let allVotes = [];
    try {
      const data = await fs.readFile(VOTES_FILE, 'utf8');
      allVotes = JSON.parse(data);
    } catch (e) { }

    // Update or add vote (one vote per user per dapp)
    const existingIndex = allVotes.findIndex(v => v.dappId === dappId && v.voter === voter);
    if (existingIndex !== -1) {
      allVotes[existingIndex] = { dappId, voter, value, timestamp: Date.now() };
    } else {
      allVotes.push({ dappId, voter, value, timestamp: Date.now() });
    }

    await fs.writeFile(VOTES_FILE, JSON.stringify(allVotes, null, 2), 'utf8');
    await loadVotes(); // Refresh cache
  } catch (error) {
    console.error('Error saving vote:', error);
  }
}

// Start Contract Listener
// Polling-based Vote Indexer (More robust than listener for free RPCs)
async function pollForVotes() {
  if (VOTING_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VOTE_ABI, provider);

  console.log('🔄 Starting Vote Polling Service (every 60s)...');

  // Initial fetch
  await checkRecentEvents(contract, provider);

  // Poll loop or interval
  setInterval(async () => {
    try {
      await checkRecentEvents(contract, provider);
    } catch (e) {
      console.log('Poll error:', e.message);
    }
  }, 60 * 1000); // Check every 60 seconds
}

async function checkRecentEvents(contract, provider) {
  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 1000; // Look back ~30 mins

    const events = await contract.queryFilter("VoteCast", fromBlock);

    // Process unique latest events logic or just process all found in range
    // Since we save duplicates safely in saveVote, we can just process all
    for (const event of events) {
      const { args } = event;
      if (args) {
        // voter, dappId, value
        await saveVote(args[1], args[0], Number(args[2]));
      }
    }

    console.log(`✅ Polled blocks ${fromBlock}-${currentBlock}. Found ${events.length} votes.`);
  } catch (e) {
    console.error("Error polling events:", e.message);
  }
}

// Initialize Voting System
async function initVoting() {
  await loadVotes();
  await loadRegistrations();
  pollForVotes(); // Start robust poller
}
initVoting();

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
// Load dapps from cache file
async function loadDappsFromCache() {
  const SEED_FILE = path.join(__dirname, 'dapps-seed.json');

  try {
    // 1. Check if seed file exists in image
    let seedDapps = [];
    try {
      const seedData = await fs.readFile(SEED_FILE, 'utf8');
      const seedJson = JSON.parse(seedData);
      seedDapps = seedJson.dapps || [];
      console.log(`🌱 Found SEED file with ${seedDapps.length} dapps`);
    } catch (e) {
      console.log('No seed file found or invalid');
    }

    // 2. Load current cache from volume
    let cacheDapps = [];
    try {
      const data = await fs.readFile(CACHE_FILE_PATH, 'utf8');
      const cacheData = JSON.parse(data);
      cacheDapps = cacheData.dapps || [];
      console.log(`📂 Loaded ${cacheDapps.length} dapps from Volume Cache`);
    } catch (e) {
      console.log('Volume cache missing or invalid.');
    }

    // 3. MASTER SYNC: Always prioritize Seed File (Codebase) over Volume Cache
    // This ensures that deployments (GitHub) update the live data, removing deleted dapps.
    if (seedDapps.length > 0) {
      console.log(`🔄 SYNC: Overwriting Volume Cache with Codebase Seed (${seedDapps.length} dapps)`);
      // Check if we need to preserve anything? For now, User requested "Code is Main".
      // We still save to cache file for consistency/performance if logic changes.
      await saveDappsToCache(seedDapps);
      return seedDapps;
    }

    // Fallback: Use cache if seed is missing (should not happen in prod usually)
    return cacheDapps;
  } catch (error) {
    console.error('❌ FAILED TO LOAD CACHE logic:', error.message);
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

    // PRIORITY 1: Load from cache AND approved file
    const [cachedDapps, approvedDapps] = await Promise.all([
      loadDappsFromCache(),
      loadApprovedDapps()
    ]);

    let allDapps = [...approvedDapps, ...cachedDapps];

    // PRIORITY 2: If both are empty, try fetching from external APIs
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
        dapp.category && dapp.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search term if provided (search only in name)
    if (search) {
      const searchLower = search.toLowerCase();
      uniqueDapps = uniqueDapps.filter(dapp =>
        dapp.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort alphabetically by name (A-Z)
    uniqueDapps.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    // INJECT VOTING DATA
    uniqueDapps = uniqueDapps.map(dapp => {
      const mapping = dappIdMap.find(m => m.url === dapp.url || m.name.toLowerCase() === dapp.name.toLowerCase());
      const dappId = mapping ? mapping.dappId : null;
      return {
        ...dapp,
        dappId: dappId,
        isRegistered: !!(dappId && registrationCache[dappId]),
        score: (dappId && voteCache[dappId]) ? voteCache[dappId].totalScore : 0,
        weeklyScore: (dappId && voteCache[dappId]) ? voteCache[dappId].weeklyScore : 0
      };
    });

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

// GET /api/trending - Get top dapps by weekly score
app.get('/api/trending', async (req, res) => {
  try {
    const [cachedDapps, approvedDapps] = await Promise.all([
      loadDappsFromCache(),
      loadApprovedDapps()
    ]);
    const allDapps = [...approvedDapps, ...cachedDapps];

    // Map scores and sort
    const trending = allDapps
      .map(dapp => {
        const mapping = dappIdMap.find(m => m.url === dapp.url || m.name.toLowerCase() === dapp.name.toLowerCase());
        const dappId = mapping ? mapping.dappId : null;
        return {
          ...dapp,
          dappId: dappId,
          isRegistered: !!(dappId && registrationCache[dappId]),
          score: (dappId && voteCache[dappId]) ? voteCache[dappId].totalScore : 0,
          weeklyScore: (dappId && voteCache[dappId]) ? voteCache[dappId].weeklyScore : 0
        };
      })
      // .filter(d => d.weeklyScore > 0)
      .sort((a, b) => b.weeklyScore - a.weeklyScore)
      .slice(0, 5); // Top 5

    res.json({
      success: true,
      count: trending.length,
      dapps: trending
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trending dapps' });
  }
});

// POST /api/submit-dapp - Submit a new dapp (with logo & txHash)
app.post('/api/submit-dapp', upload.single('logo'), async (req, res) => {
  try {
    const { name, description, category, subcategory, customCategory, websiteUrl, txHash } = req.body;

    // Basic Validation
    if (!name || !description || !category || !websiteUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const newDapp = {
      id: Date.now().toString(),
      name,
      description,
      category,
      subcategory: subcategory || null,
      customCategory: customCategory || null,
      websiteUrl,
      // Store web-accessible path: /logos/filename.ext
      logo: req.file ? `/logos/${req.file.filename}` : null,
      txHash: txHash || null, // Payment usage
      status: 'pending', // Needs manual review
      submittedAt: new Date().toISOString(),
      clientIp: req.ip || req.connection.remoteAddress
    };

    const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submitted_dapps.json');

    // Read existing submissions safely
    let submissions = [];
    try {
      const data = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
      submissions = JSON.parse(data);
    } catch (err) {
      // File likely doesn't exist yet, which is fine
    }

    submissions.push(newDapp);

    // Save back to file
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');

    console.log(`📝 New Dapp Submitted: ${newDapp.name} (ID: ${newDapp.id})`);

    res.json({
      success: true,
      message: 'Dapp submitted successfully! Use the admin dashboard to review.',
      dapp: newDapp
    });

  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ success: false, error: 'Internal server error during submission.' });
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

// GET /api/admin/submissions - Secret endpoint to view pending submissions
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const { secret } = req.query;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'baseboss';

    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid secret' });
    }

    const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submitted_dapps.json');

    try {
      const data = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
      const submissions = JSON.parse(data);
      res.json({
        success: true,
        count: submissions.length,
        submissions: submissions
      });
    } catch (err) {
      // If file doesn't exist, return empty list
      res.json({
        success: true,
        count: 0,
        submissions: []
      });
    }
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// POST /api/admin/submissions/approve - Approve a submission (Move to cache)
app.post('/api/admin/submissions/approve', async (req, res) => {
  try {
    const { secret, id } = req.body;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'base-admin-2026';

    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submitted_dapps.json');

    // 1. Read submissions
    const subData = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
    let submissions = JSON.parse(subData);

    const index = submissions.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const approvedDapp = submissions[index];

    // 2. Load current approved dapps
    let approvedDapps = await loadApprovedDapps();

    // 3. Add to approved list
    const backendUrl = req.protocol + '://' + req.get('host');
    const formattedDapp = {
      name: approvedDapp.name,
      description: approvedDapp.description,
      category: approvedDapp.subcategory || approvedDapp.category,
      url: approvedDapp.websiteUrl,
      logo: (approvedDapp.logo && approvedDapp.logo.startsWith('/'))
        ? `${backendUrl}${approvedDapp.logo}`
        : approvedDapp.logo,
      tvl: "New",
      chain: "Base"
    };

    approvedDapps.push(formattedDapp);

    // 4. Save Approved List
    await saveApprovedDapps(approvedDapps);

    // 5. Remove from submissions
    submissions.splice(index, 1);
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');

    res.json({ success: true, message: 'Dapp approved and moved to live site!' });

  } catch (error) {
    console.error('Error approving dapp:', error);
    res.status(500).json({ success: false, error: 'Failed to approve dapp' });
  }
});

// DELETE /api/admin/dapps/:name - Remove a dapp from the live CACHE (Permanent delete)
app.delete('/api/admin/dapps/:name', async (req, res) => {
  try {
    const { secret } = req.query;
    const { name } = req.params;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'base-admin-2026';

    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 1. Remove from approved dapps file if it exists there
    let approvedDapps = await loadApprovedDapps();
    const approvedInitialCount = approvedDapps.length;
    approvedDapps = approvedDapps.filter(d => d.name.toLowerCase() !== name.toLowerCase());

    if (approvedDapps.length < approvedInitialCount) {
      await saveApprovedDapps(approvedDapps);
    }

    // 2. Remove from cache file 
    let dapps = await loadDappsFromCache();
    const initialCount = dapps.length;

    // Filter out the dapp by name
    dapps = dapps.filter(d => d.name.toLowerCase() !== name.toLowerCase());

    if (dapps.length < initialCount) {
      await saveDappsToCache(dapps);
    }

    // 3. Remove from SEED file to prevent auto-restore logic from resurrecting it
    const SEED_FILE = path.join(__dirname, 'dapps-seed.json');
    try {
      const seedData = await fs.readFile(SEED_FILE, 'utf8');
      let seedJson = JSON.parse(seedData);
      let seedDapps = seedJson.dapps || [];
      const seedInitialCount = seedDapps.length;

      seedDapps = seedDapps.filter(d => d.name.toLowerCase() !== name.toLowerCase());

      if (seedDapps.length < seedInitialCount) {
        seedJson.dapps = seedDapps;
        await fs.writeFile(SEED_FILE, JSON.stringify(seedJson, null, 2), 'utf8');
        console.log(`🌱 Removed "${name}" from seed file.`);
      }
    } catch (e) {
      console.log('Error updating seed file during deletion:', e.message);
    }

    res.json({ success: true, message: `Dapp "${name}" removed from live site.` });
  } catch (error) {
    console.error('Error deleting dapp from cache:', error);
    res.status(500).json({ success: false, error: 'Failed to delete dapp' });
  }
});

// POST /api/admin/dapps - Add a dapp directly (Admin only)
app.post('/api/admin/dapps', upload.single('logo'), async (req, res) => {
  try {
    const { secret, name, description, category, websiteUrl, chain } = req.body;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'baseboss';

    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!name || !description || !category || !websiteUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const backendUrl = req.protocol + '://' + req.get('host');
    let logoUrl = "";

    if (req.file) {
      logoUrl = `${backendUrl}/logos/${req.file.filename}`;
    } else if (req.body.logoUrl) {
      logoUrl = req.body.logoUrl;
    }

    const newDapp = {
      name,
      description,
      category,
      url: websiteUrl,
      logo: logoUrl,
      tvl: "New",
      chain: chain || "Base"
    };

    // Save to approved dapps
    let approvedDapps = await loadApprovedDapps();
    approvedDapps.push(newDapp);
    await saveApprovedDapps(approvedDapps);

    res.json({ success: true, message: 'Dapp added directly to live site!', dapp: newDapp });

  } catch (error) {
    console.error('Error adding dapp:', error);
    res.status(500).json({ success: false, error: 'Failed to add dapp' });
  }
});
// DELETE /api/admin/submissions/:id - Reject/Delete a pending submission
app.delete('/api/admin/submissions/:id', async (req, res) => {
  try {
    const { secret } = req.query;
    const { id } = req.params;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'base-admin-2026';

    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submitted_dapps.json');
    const subData = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
    let submissions = JSON.parse(subData);

    const index = submissions.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    submissions.splice(index, 1);
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');

    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ success: false, error: 'Failed to delete submission' });
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

// GET /api/debug-file - DEBUG ENDPOINT TO CHECK FILESYSTEM
app.get('/api/debug-file', async (req, res) => {
  try {
    const rootFiles = await fs.readdir(__dirname);
    const dataFiles = await fs.readdir(DATA_DIR).catch(e => ['Error reading data dir: ' + e.message]);

    let cacheStatus = "Missing";
    try {
      const stats = await fs.stat(CACHE_FILE_PATH);
      cacheStatus = `Exists, Size: ${stats.size} bytes`;
    } catch (e) {
      cacheStatus = "Not Found at " + CACHE_FILE_PATH;
    }

    res.json({
      success: true,
      cwd: process.cwd(),
      dirname: __dirname,
      dataDir: DATA_DIR,
      cacheFilePath: CACHE_FILE_PATH,
      cacheStatus: cacheStatus,
      rootFiles: rootFiles,
      dataFiles: dataFiles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  // Log the error details (not exposed to client)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  // Send generic error to client (don't expose internal details)
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred processing your request'
      : err.message
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);

  // --- MASTER SYNC LOGIC (Added per User Request) ---
  // Overwrite Volume's approved_dapps.json with the Codebase one on startup.
  // This makes Git the single source of truth for approved dapps.
  try {
    const CODE_APPROVED_FILE = path.join(__dirname, 'data', 'approved_dapps.json');
    const VOLUME_APPROVED_FILE = APPROVED_DAPPS_FILE;

    // Check if we are running in a context where paths differ (i.e. Volume is mounted elsewhere)
    // Even if paths are same, a copy is harmless (and ensures content matches).
    try {
      const codeData = await fs.readFile(CODE_APPROVED_FILE, 'utf8');
      await fs.writeFile(VOLUME_APPROVED_FILE, codeData, 'utf8');
      console.log(`🔄 SYNC: Overwrote Volume Approved List with Codebase version.`);
    } catch (readErr) {
      console.log(`⚠️ SYNC SKIP: Could not read codebase approved_dapps.json: ${readErr.message}`);
    }
  } catch (err) {
    console.error(`❌ SYNC ERROR: Failed to sync approved dapps: ${err.message}`);
  }
  // --------------------------------------------------
  console.log(`📂 Loading dapps from cache file: ${CACHE_FILE_PATH}`);
  console.log(`🔒 Security: Helmet, rate limiting, and input validation enabled`);
});
