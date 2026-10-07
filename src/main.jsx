import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import HomePage from './pages/HomePage.jsx'
import { ADMIN_KEY, adminBase } from './config/adminPath.js'
import ErrorBoundary from './views/ui/ErrorBoundary.jsx'
import OfflineBanner from './views/ui/OfflineBanner.jsx'
import MaintenanceGate from './views/ui/MaintenanceGate.jsx'
import { ErrorFrame } from './views/ui/ApiStatusScreen.jsx'

// Lazy-loaded Shop & Account routes
const ShopShell = lazy(() => import('./views/shop/layouts/ShopShell.jsx'))
const ShopHome = lazy(() => import('./views/shop/pages/ShopHome.jsx'))
const ProductList = lazy(() => import('./views/shop/pages/ProductList.jsx'))
const ProductDetail = lazy(() => import('./views/shop/pages/ProductDetail.jsx'))
const CartPage = lazy(() => import('./views/shop/pages/CartPage.jsx'))
const CheckoutChoice = lazy(() => import('./views/shop/pages/CheckoutChoice.jsx'))
const CheckoutPage = lazy(() => import('./views/shop/pages/CheckoutPage.jsx'))
const OrderSuccess = lazy(() => import('./views/shop/pages/OrderSuccess.jsx'))
const AccountPage = lazy(() => import('./views/shop/pages/AccountPage.jsx'))
const AccountOrderPage = lazy(() => import('./views/shop/pages/AccountOrderPage.jsx'))
const CustomizePage = lazy(() => import('./views/shop/pages/CustomizePage.jsx'))
const Custom3DPrintingPage = lazy(() => import('./views/shop/pages/Custom3DPrintingPage.jsx'))

// Lazy-loaded Admin routes
const AdminShell = lazy(() => import('./views/admin/layouts/AdminShell.jsx'))
const AdminLogin = lazy(() => import('./views/admin/pages/AdminLogin.jsx'))
const AdminDashboard = lazy(() => import('./views/admin/pages/AdminDashboard.jsx'))
const AdminProducts = lazy(() => import('./views/admin/pages/AdminProducts.jsx'))
const AdminProductForm = lazy(() => import('./views/admin/pages/AdminProductForm.jsx'))
const AdminCategories = lazy(() => import('./views/admin/pages/AdminCategories.jsx'))
const AdminCategoryDetail = lazy(() => import('./views/admin/pages/AdminCategoryDetail.jsx'))
const AdminOrders = lazy(() => import('./views/admin/pages/AdminOrders.jsx'))
const AdminOrderDetail = lazy(() => import('./views/admin/pages/AdminOrderDetail.jsx'))
const AdminInventory = lazy(() => import('./views/admin/pages/AdminInventory.jsx'))
const AdminCustomRequests = lazy(() => import('./views/admin/pages/AdminCustomRequests.jsx'))
const AdminCustomRequestDetail = lazy(() => import('./views/admin/pages/AdminCustomRequestDetail.jsx'))

// Status / Error pages (shared across app)
import NotFoundPage from './views/shop/pages/NotFoundPage.jsx'
import ServerErrorPage from './views/shop/pages/ServerErrorPage.jsx'
import ForbiddenPage from './views/shop/pages/ForbiddenPage.jsx'
import MaintenancePage from './views/shop/pages/MaintenancePage.jsx'

function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent" />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <OfflineBanner />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route element={<MaintenanceGate />}>
            <Route element={<App />}>
              <Route path="/" element={<HomePage />} />
            </Route>

            <Route path="/shop" element={<ShopShell />}>
              <Route index element={<ShopHome />} />
              <Route path="products" element={<ProductList />} />
              <Route path="category/:slug" element={<ProductList categoryMode />} />
              <Route path="product/:slug" element={<ProductDetail />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutChoice />} />
              <Route path="checkout/details" element={<CheckoutPage />} />
              <Route path="order-success" element={<OrderSuccess />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="account/orders/:id" element={<AccountOrderPage />} />
              <Route path="customize" element={<CustomizePage />} />
              <Route path="custom-printing" element={<Custom3DPrintingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path={`/${ADMIN_KEY}/admin/login`} element={<AdminLogin />} />
            <Route path={`/${ADMIN_KEY}/admin`} element={<AdminShell />}>
              <Route index element={<Navigate to={`${adminBase}/login`} replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id/edit" element={<AdminProductForm />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="categories/:id" element={<AdminCategoryDetail />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="custom-requests" element={<AdminCustomRequests />} />
              <Route path="custom-requests/:id" element={<AdminCustomRequestDetail />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {ADMIN_KEY !== 'invitech' && (
              <>
                <Route path="/invitech/admin/login" element={<Navigate to={`${adminBase}/login`} replace />} />
                <Route path="/invitech/admin/*" element={<Navigate to={adminBase} replace />} />
              </>
            )}
            {ADMIN_KEY !== 'invihub' && (
              <>
                <Route path="/invihub/admin/login" element={<Navigate to={`${adminBase}/login`} replace />} />
                <Route path="/invihub/admin/*" element={<Navigate to={adminBase} replace />} />
              </>
            )}

            <Route
              path="/error/server"
              element={
                <ErrorFrame>
                  <ServerErrorPage />
                </ErrorFrame>
              }
            />
            <Route
              path="/error/forbidden"
              element={
                <ErrorFrame>
                  <ForbiddenPage />
                </ErrorFrame>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ErrorFrame>
                  <MaintenancePage />
                </ErrorFrame>
              }
            />
            <Route
              path="*"
              element={
                <ErrorFrame>
                  <NotFoundPage />
                </ErrorFrame>
              }
            />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
