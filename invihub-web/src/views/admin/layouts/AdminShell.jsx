import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Warehouse,
  LogOut,
} from 'lucide-react'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import { useAdminGate } from '../../../controllers/useAdminGate'

export default function AdminShell() {
  const ok = useAdminGate()
  const navigate = useNavigate()
  const location = useLocation()
  const atAdminRoot = location.pathname.replace(/\/$/, '') === adminBase.replace(/\/$/, '')

  if (atAdminRoot) return <Navigate to={`${adminBase}/login`} replace />
  if (ok === null) return <div className="min-h-screen bg-[#0a0a0a] p-10 text-white/50">Loading…</div>
  if (!ok) return <Navigate to={`${adminBase}/login`} replace />

  const item = (to, label, Icon) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`
      }
    >
      <Icon size={16} className="text-[#c5a059]" />
      {label}
    </NavLink>
  )

  return (
    <div className="admin-ui flex min-h-screen bg-[#0a0a0a] text-white">
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 py-6">
        <Link to={adminBase} className="flex items-center gap-2 px-4 pb-6">
          <img src="/images/logo.png" alt="" className="h-8 w-8 rounded-full bg-white object-contain" />
          <span className="font-serif text-lg">INVIHUB</span>
        </Link>
        <nav className="space-y-1 px-2">
          {item(`${adminBase}/dashboard`, 'Dashboard', LayoutDashboard)}
          {item(`${adminBase}/products`, 'Products', Package)}
          {item(`${adminBase}/categories`, 'Categories', FolderTree)}
          {item(`${adminBase}/orders`, 'Orders', ShoppingBag)}
          {item(`${adminBase}/inventory`, 'Inventory', Warehouse)}
        </nav>
        <button
          type="button"
          className="mt-auto flex items-center gap-2 px-5 py-3 text-sm text-white/40 hover:text-white"
          onClick={async () => {
            await api.adminLogout()
            navigate(`${adminBase}/login`)
          }}
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>
      <div className="min-w-0 flex-1 p-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}
