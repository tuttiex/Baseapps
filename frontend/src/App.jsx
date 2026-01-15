import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './Home'
import AllDapps from './AllDapps'
import AddDapps from './AddDapps'
import Admin from './Admin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/all-dapps" element={<AllDapps />} />
      <Route path="/add-dapps" element={<AddDapps />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App
