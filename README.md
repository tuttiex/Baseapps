# Base Network Dapps Explorer

A full-stack web application to explore and discover all decentralized applications (dapps) on the Base network.

## Features

- 🔍 Search dapps by name, description, or category
- 📂 Filter dapps by category (DeFi, Social, Bridge, Infrastructure, etc.)
- 🎨 Modern, responsive UI with beautiful gradient design
- 🔄 Real-time data fetching from multiple sources
- 🚀 Fast and lightweight

## Tech Stack

### Backend
- Node.js with Express.js
- RESTful API
- CORS enabled for frontend communication
- Integration with DefiLlama API for real-time dapp data

### Frontend
- React 18
- Vite for fast development and building
- Modern CSS with gradient design
- Responsive layout

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### GET `/api/dapps`
Get all dapps with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "DeFi", "Social")
- `search` (optional): Search term to filter dapps

**Example:**
```
GET http://localhost:3001/api/dapps?category=DeFi&search=swap
```

### GET `/api/dapps/categories`
Get all available categories.

### GET `/api/health`
Health check endpoint.

## Project Structure

```
Baseapps/
├── backend/
│   ├── server.js          # Express server and API routes
│   ├── package.json       # Backend dependencies
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── App.css        # Styles
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
└── README.md
```

## Usage

1. Start both servers (backend and frontend)
2. Open your browser to `http://localhost:3000`
3. Browse, search, and filter dapps on the Base network
4. Click "Visit Dapp" to open any dapp in a new tab

## Development

### Backend Development
- The backend uses Express.js with CORS enabled
- API routes are defined in `server.js`
- Dapps data is fetched from DefiLlama API with fallback to static data

### Frontend Development
- React components are in `src/App.jsx`
- Styles are in `src/App.css`
- Vite proxy is configured to forward `/api` requests to the backend

## Future Enhancements

- Add more data sources for comprehensive dapp listings
- Implement user favorites/bookmarks
- Add dapp ratings and reviews
- Real-time TVL updates
- Advanced filtering options
- Dark mode toggle

## License

ISC

