# 🔵 Base Network Dapps Explorer

[![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Security Audit](https://img.shields.io/badge/Security_Audit-PASS-success)](https://github.com/tuttiex/Baseapps)
[![License](https://img.shields.io/badge/license-ISC-lightgrey.svg)](LICENSE)

A production-ready, full-stack web application to explore and discover decentralized applications (dapps) on the **Base network**. Built with performance, security, and user experience in mind.

---

## ✨ Features

### 🛡️ Enterprise-Grade Security
*   **Rate Limiting:** Protects against DDoS with strict limits (100 req/15m).
*   **HPP Protection:** Middleware guards against HTTP Parameter Pollution attacks.
*   **Security Headers:** `Helmet` (Backend) and configured Vercel headers (Frontend) enforce strict CSP, HSTS, and X-Content-Type protections.
*   **Input Sanitization:** All user inputs are validated and sanitized to prevent injection attacks.

### 🔍 Optimized Search
*   **Precision Filtering:** Smart backend logic allows searching by *Name Only* to avoid irrelevant results from generic descriptions.
*   **Quick Search:** Live autocomplete dropdown with debounced API calls for instant suggestions as you type.
*   **Deep Linking:** Shareable URLs for specific search results.

### ⚡ Modern UX/UI
*   **Responsive Design:** Fully optimized for Mobile, Tablet, and Desktop.
*   **Dark Mode:** Auto-detects system preference with manual toggle.
*   **Performance:** React + Vite ensures lightning-fast page loads.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Styling:** Modern CSS3 (Variables, Flexbox/Grid)
*   **State Management:** React Hooks
*   **Security:** `dompurify`, `isomorphic-dompurify`

### Backend
*   **Runtime:** Node.js
*   **Server:** Express.js
*   **Security:** `helmet`, `hpp`, `express-rate-limit`, `express-validator`
*   **Logging:** `morgan`
*   **Data:** Local caching + Real-time APIs (DefiLlama fallback)

---

## 🚀 Getting Started

### 🌐 Live Demo
Visit the live application at **[baseapps.org](https://baseapps.org)**

### 💻 Local Development

#### Prerequisites
*   Node.js (v16 or higher)
*   npm or yarn

#### 1. Backend Setup
The backend runs on port `3001` and serves the API.

```bash
cd backend
npm install
npm start
# OR for development
npm run dev
```

### 2. Frontend Setup
The frontend runs on port `3000` (proxy configured to backend).

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to browse the app.

---

## 🔒 Security Measures
This codebase has undergone a comprehensive internal security audit (Jan 2026).

*   **DoS Protection:** API endpoints are rate-limited per IP.
*   **Parameter Pollution:** `hpp` library cleaning prevents logic bypasses.
*   **Crash Prevention:** `express-async-errors` and centralized ErrorHandling patterns.
*   **Dependency Scanning:** Regular `npm audit` checks (Current: 0 Backend Vulnerabilities).

---

## 🗺️ Roadmap: Phase 2
We are preparing for Web3 Integration. Upcoming features:
*   [ ] Wallet Connection (RainbowKit / Wagmi)
*   [ ] Smart Contract Interaction
*   [ ] On-chain User Profiles
*   [ ] Submit Your Dapp (Web3 Auth verified)

---

**Powered by Base Network** 🔵
