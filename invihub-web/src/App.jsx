import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'

export default function App() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-black text-text antialiased selection:bg-white selection:text-black">
      <Header />
      <Outlet />
      <Footer />
      <BackToTop />
    </div>
  )
}
