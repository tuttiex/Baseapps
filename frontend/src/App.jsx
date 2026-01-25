import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './Home'
import AllDapps from './AllDapps'
import AddDapps from './AddDapps'
import Admin from './Admin'
import Profile from './pages/Profile'
import Blog from './Blog'
import BlogPost from './BlogPost'
import Bounties from './Bounties'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/all-dapps" element={<AllDapps />} />
      <Route path="/add-dapps" element={<AddDapps />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/profile/:address" element={<Profile />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/bounties" element={<Bounties />} />
    </Routes>
  )
}

export default App
