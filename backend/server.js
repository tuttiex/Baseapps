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

// Database Queries
const {
  createDapp, getDapps, getDappById, getDappByName,
  approveDapp, deleteDapp, castVote, getUserVote
} = require('./db/queries');
const pool = require('./db/pool');

// Trust Proxy for Railway load balancer
app.set('trust proxy', 1);

// Security Headers - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // SECURITY: Removed 'unsafe-inline' and 'unsafe-eval'
      // If your frontend needs inline scripts, you must use a nonce or hash.
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // unsafe-inline often needed for CSS-in-JS libs
      imgSrc: ["'self'", "data:", "blob:", "https:"], // Allow images from anywhere (HTTPS)
      connectSrc: ["'self'", "https:", "wss:", "http://localhost:*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Request Logging - Morgan
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// Helper to skip rate limiting for trusted origins
// Helper to skip rate limiting for trusted origins (REMOVED: Header Spoofing Risk)
// We should rely on IP limiting for DDOS protection, regardless of Origin.
// If you need whitelisting for internal services, check request IP against trusted subnet.
const skipTrustedOrigins = (req) => {
  return false; // Do not skip based on headers
};

// Rate Limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTrustedOrigins // Whitelist our site
});

// Rate Limiting - Search endpoint (stricter for bots, but open for our site)
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 50 to 300
  message: {
    success: false,
    error: 'Too many search requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTrustedOrigins // Whitelist our site
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
    // SECURITY: Strictly block SVG files as they can contain XSS scripts
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only safe image formats (JPEG, PNG, WEBP) are allowed. SVGs are blocked for security.'), false);
    }
  }
});

// ============================================
// USER PROFILES - Routes
// ============================================
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const { requireAdminSecret } = require('./middleware/auth');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Serve avatars directory
const AVATARS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'avatars');
app.use('/avatars', express.static(AVATARS_DIR));

// ============================================
// BASE NETWORK INTEGRATION
// ============================================


// Base network RPC endpoint
const BASE_RPC_URL = 'https://mainnet.base.org';

const VOTING_CONTRACT_ADDRESS = process.env.VOTING_CONTRACT_ADDRESS || '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';

// Database handles persistence.
// Legacy file helpers removed.

// Database handles persistence now.
// Legacy file helpers removed.

// Helper to load approved dapps
// Polling logic below...

const VOTE_ABI = [
  "event VoteCast(address indexed voter, bytes32 indexed dappId, int8 value)",
  "event DappRegistered(bytes32 indexed dappId)",
  "event DappUnregistered(bytes32 indexed dappId)",
  "function dappScore(bytes32 dappId) view returns (int256)",
  "function isDappRegistered(bytes32 dappId) view returns (bool)"
];

async function saveVote(dappId, voter, value) {
  try {
    // Save to DB via imported function
    await castVote(dappId, voter, value);
    console.log(`✅ On-chain Vote Indexed: ${voter} -> ${dappId} (${value})`);
  } catch (error) {
    console.error('Error indexing vote:', error.message);
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
  pollForVotes(); // Start robust poller
}
initVoting();

// External API fetching removed - Strictly using Database now.

// GET /api/dapps - Get all dapps
app.get('/api/dapps', async (req, res) => {
  try {
    const { category, search } = req.query;

    // Fetch from Database
    let dapps = await getDapps('approved');

    // Filter by category if provided
    if (category && category !== 'all') {
      dapps = dapps.filter(dapp =>
        dapp.category && dapp.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search term if provided (search only in name)
    if (search) {
      const searchLower = search.toLowerCase();
      dapps = dapps.filter(dapp =>
        dapp.name.toLowerCase().includes(searchLower)
      );
    }

    const backendUrl = req.protocol + '://' + req.get('host');

    res.json({
      success: true,
      count: dapps.length,
      dapps: dapps.map(d => ({
        ...d,
        url: d.website_url, // map db column back to frontend expected key
        logo: d.logo_url && d.logo_url.startsWith('/')
          ? `${backendUrl}${d.logo_url}`
          : d.logo_url
      }))
    });
  } catch (error) {
    console.error('Error fetching dapps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dapps'
    });
  }
});

// GET /api/trending - Get top dapps by score
app.get('/api/trending', async (req, res) => {
  try {
    const dapps = await getDapps('approved');
    // dapps are already sorted by score DESC in getDapps query (see db/queries.js)

    const backendUrl = req.protocol + '://' + req.get('host');

    const trending = dapps.slice(0, 5).map(d => ({
      ...d,
      url: d.website_url,
      logo: d.logo_url && d.logo_url.startsWith('/')
        ? `${backendUrl}${d.logo_url}`
        : d.logo_url
    }));

    res.json({
      success: true,
      count: trending.length,
      dapps: trending
    });
  } catch (error) {
    console.error('Error fetching trending dapps:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending dapps' });
  }
});

// POST /api/submit-dapp - Submit a new dapp (with logo & txHash)
app.post('/api/submit-dapp', upload.single('logo'), async (req, res) => {
  try {
    const { name, description, category, subcategory, customCategory, websiteUrl, txHash, submittedBy } = req.body;

    // Basic Validation
    if (!name || !description || !category || !websiteUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const newDapp = await createDapp({
      name,
      description,
      category,
      subcategory: subcategory || null,
      websiteUrl,
      logoUrl: req.file ? `/logos/${req.file.filename}` : null,
      chain: 'Base',
      status: 'pending',
      submittedBy: submittedBy || null
    });

    console.log(`📝 New Dapp Submitted: ${newDapp.name} (ID: ${newDapp.id})`);

    res.json({
      success: true,
      message: 'Dapp submitted successfully! Use the admin dashboard to review.',
      dapp: newDapp
    });

  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dapps/categories - Get all categories (organized hierarchically)
app.get('/api/dapps/categories', async (req, res) => {
  try {
    // Fetch all approved dapps from DB
    const allDapps = await getDapps('approved');

    // Extract unique minor categories
    const minorCategories = [...new Set(allDapps.map(dapp => dapp.category))];

    // Category hierarchy mapping
    const categoryHierarchy = {
      "DeFi": ["Dexs", "Lending & CDP", "Derivatives & Options", "Yield & Yield Strategies",
        "RWA", "Stablecoins", "Prediction Market", "Portfolio",
        "Liquid Staking", "Insurance", "DeFi"],
      "Infrastructure": ["Bridges", "Developer Tools", "Data & Analytics",
        "Capital Allocators", "Liquidity Manager", "Launchpad",
        "Security", "Identity", "Services", "Oracles", "Infrastructure"],
      "Consumer": ["Gaming", "NFTs", "Social & Entertainment", "Wallets", "Payments",
        "Onramps", "Creator", "DAO", "Real World", "SoFi", "Privacy", "Consumer"],
      "AI": ["AI", "AI Agents"],
      "Trading": ["CEX", "Basis Trading", "Algo-Stables", "Risk Curators", "Trading"]
    };

    // Organize categories into hierarchy
    // Initialize with full static hierarchy to ensure all categories/subcategories are visible
    const organized = JSON.parse(JSON.stringify(categoryHierarchy));
    const uncategorized = [];
    const flattenedCategories = new Set(Object.values(categoryHierarchy).flat());

    minorCategories.forEach(minor => {
      // If the category is already in our hierarchy, it's good.
      // If NOT, we need to track it for "Other"
      if (!flattenedCategories.has(minor)) {
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
    console.error('Error fetching categories:', error);
    // Fallback if DB fetch fails
    res.json({
      success: true,
      categories: {}
    });
  }
});

// GET /api/admin/submissions - Return pending dapps from DB
app.get('/api/admin/submissions', requireAdminSecret, async (req, res) => {
  try {
    const submissions = await getDapps('pending');
    const backendUrl = req.protocol + '://' + req.get('host');

    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions.map(s => ({
        ...s,
        logo: s.logo_url && s.logo_url.startsWith('/')
          ? `${backendUrl}${s.logo_url}`
          : s.logo_url,
        websiteUrl: s.website_url,
        submittedAt: s.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// POST /api/admin/submissions/approve - Approve a submission
app.post('/api/admin/submissions/approve', requireAdminSecret, async (req, res) => {
  try {
    const { id } = req.body;
    await approveDapp(id);
    res.json({ success: true, message: 'Dapp approved and made live!' });
  } catch (error) {
    console.error('Error approving dapp:', error);
    res.status(500).json({ success: false, error: 'Failed to approve dapp' });
  }
});

// DELETE /api/admin/dapps/:name - Remove a dapp
app.delete('/api/admin/dapps/:name', requireAdminSecret, async (req, res) => {
  try {
    const { name } = req.params;

    // Find ID by name
    const dapp = await getDappByName(name);
    if (dapp) {
      await deleteDapp(dapp.id);
    }

    res.json({ success: true, message: `Dapp "${name}" deleted.` });
  } catch (error) {
    console.error('Error deleting dapp:', error);
    res.status(500).json({ success: false, error: 'Failed to delete dapp' });
  }
});

// POST /api/admin/dapps - Add a dapp directly (Admin only)
app.post('/api/admin/dapps', requireAdminSecret, upload.single('logo'), async (req, res) => {
  try {
    const { name, description, category, websiteUrl, chain } = req.body;

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

    const newDapp = await createDapp({
      name,
      description,
      category,
      websiteUrl,
      logoUrl,
      chain: chain || "Base",
      status: 'approved' // Direct add = approved
    });

    res.json({ success: true, message: 'Dapp added directly!', dapp: newDapp });
  } catch (error) {
    console.error('Error adding dapp:', error);
    res.status(500).json({ success: false, error: 'Failed to add dapp' });
  }
});
// DELETE /api/admin/submissions/:id - Reject (Delete)
app.delete('/api/admin/submissions/:id', requireAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDapp(id);
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

// ============================================
// BLOG - Routes
// ============================================

const BLOG_FILE = path.join(DATA_DIR, 'blog_posts.json');

// GET /api/blog - Get all blog posts
app.get('/api/blog', async (req, res) => {
  try {
    const data = await fs.readFile(BLOG_FILE, 'utf8');
    const posts = JSON.parse(data);
    res.json({ success: true, posts });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ success: true, posts: [] });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch blog posts' });
    }
  }
});

// POST /api/admin/blog - Add a new blog post
app.post('/api/admin/blog', requireAdminSecret, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, author, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const backendUrl = req.protocol + '://' + req.get('host');
    let imageUrl = '';
    if (req.file) {
      imageUrl = `${backendUrl}/logos/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Load existing posts
    let posts = [];
    try {
      const data = await fs.readFile(BLOG_FILE, 'utf8');
      posts = JSON.parse(data);
    } catch (e) { posts = []; }

    const newPost = {
      id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
      title,
      excerpt: excerpt || content.substring(0, 150) + '...',
      content,
      author: author || 'BaseApps Team',
      category: category || 'General',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      image: imageUrl,
      featured: false
    };

    posts.unshift(newPost); // Add to top
    await fs.writeFile(BLOG_FILE, JSON.stringify(posts, null, 2), 'utf8');

    res.json({ success: true, message: 'Blog post published!', post: newPost });

  } catch (error) {
    console.error('Error adding blog post:', error);
    res.status(500).json({ success: false, error: 'Failed to publish post' });
  }
});

// DELETE /api/admin/blog/:id - Delete a blog post
app.delete('/api/admin/blog/:id', requireAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;

    let posts = [];
    try {
      const data = await fs.readFile(BLOG_FILE, 'utf8');
      posts = JSON.parse(data);
    } catch (e) { return res.status(404).json({ success: false, error: 'No posts found' }); }

    const initialLength = posts.length;
    posts = posts.filter(p => p.id !== parseInt(id));

    if (posts.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await fs.writeFile(BLOG_FILE, JSON.stringify(posts, null, 2), 'utf8');
    res.json({ success: true, message: 'Post deleted' });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// GET /api/blog/:slug - Get single blog post
app.get('/api/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    let posts = [];
    try {
      const data = await fs.readFile(BLOG_FILE, 'utf8');
      posts = JSON.parse(data);
    } catch (e) {
      return res.status(404).json({ success: false, error: 'No posts found' });
    }

    const post = posts.find(p => p.slug === slug);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// ============================================
// BOUNTIES - Routes
// ============================================

const BOUNTIES_FILE = path.join(DATA_DIR, 'bounties.json');

// GET /api/bounties - Get all bounties
app.get('/api/bounties', async (req, res) => {
  try {
    const data = await fs.readFile(BOUNTIES_FILE, 'utf8');
    const bounties = JSON.parse(data);

    // Support filtering via query params if needed, or return all
    res.json({ success: true, bounties });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ success: true, bounties: [] });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch bounties' });
    }
  }
});

// POST /api/admin/bounties - Add a new bounty
app.post('/api/admin/bounties', requireAdminSecret, upload.single('logo'), async (req, res) => {
  try {
    const { title, type, category, dappName, description, reward, currency, difficulty, timeframe, skills } = req.body;

    if (!title || !description || !reward || !dappName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const backendUrl = req.protocol + '://' + req.get('host');
    let logoUrl = ''; // Default or empty

    // Handle Logo: Upload > URL > Default
    if (req.file) {
      logoUrl = `${backendUrl}/logos/${req.file.filename}`;
    } else if (req.body.dappLogo) {
      logoUrl = req.body.dappLogo;
    } else {
      logoUrl = 'https://baseapps-production.up.railway.app/logos/logo-1768595750102-562798533.png'; // Fallback to BaseApps logo
    }

    // Load existing bounties
    let bounties = [];
    try {
      const data = await fs.readFile(BOUNTIES_FILE, 'utf8');
      bounties = JSON.parse(data);
    } catch (e) { bounties = []; }

    const newBounty = {
      id: bounties.length > 0 ? Math.max(...bounties.map(b => b.id)) + 1 : 1,
      title,
      type: type || 'task',
      category: category || 'Other',
      dappName,
      dappLogo: logoUrl,
      description,
      reward,
      currency: currency || 'USDC',
      difficulty: difficulty || 'Intermediate',
      timeframe: timeframe || '1 week',
      skills: skills ? skills.split(',').map(s => s.trim()) : [],
      postedDate: new Date().toISOString().split('T')[0],
      applicants: 0,
      status: 'open'
    };

    bounties.unshift(newBounty);
    await fs.writeFile(BOUNTIES_FILE, JSON.stringify(bounties, null, 2), 'utf8');

    res.json({ success: true, message: 'Bounty posted!', bounty: newBounty });

  } catch (error) {
    console.error('Error posting bounty:', error);
    res.status(500).json({ success: false, error: 'Failed to post bounty' });
  }
});

// DELETE /api/admin/bounties/:id
app.delete('/api/admin/bounties/:id', requireAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;

    let bounties = [];
    try {
      const data = await fs.readFile(BOUNTIES_FILE, 'utf8');
      bounties = JSON.parse(data);
    } catch (e) { return res.status(404).json({ success: false, error: 'No bounties found' }); }

    const initialLength = bounties.length;
    bounties = bounties.filter(b => b.id !== parseInt(id));

    if (bounties.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    await fs.writeFile(BOUNTIES_FILE, JSON.stringify(bounties, null, 2), 'utf8');
    res.json({ success: true, message: 'Bounty deleted' });

  } catch (error) {
    console.error('Error deleting bounty:', error);
    res.status(500).json({ success: false, error: 'Failed to delete bounty' });
  }
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
  console.log(`🔒 Security: Helmet, rate limiting, and input validation enabled`);
});
