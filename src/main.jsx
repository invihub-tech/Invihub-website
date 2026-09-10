import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import HomePage from './pages/HomePage.jsx'
import ShopShell from './views/shop/layouts/ShopShell.jsx'
import ShopHome from './views/shop/pages/ShopHome.jsx'
import ProductList from './views/shop/pages/ProductList.jsx'
import ProductDetail from './views/shop/pages/ProductDetail.jsx'
import CartPage from './views/shop/pages/CartPage.jsx'
import CheckoutChoice from './views/shop/pages/CheckoutChoice.jsx'
import CheckoutPage from './views/shop/pages/CheckoutPage.jsx'
import OrderSuccess from './views/shop/pages/OrderSuccess.jsx'
import AccountPage from './views/shop/pages/AccountPage.jsx'
import AccountOrderPage from './views/shop/pages/AccountOrderPage.jsx'
import NotFoundPage from './views/shop/pages/NotFoundPage.jsx'
import ServerErrorPage from './views/shop/pages/ServerErrorPage.jsx'
import ForbiddenPage from './views/shop/pages/ForbiddenPage.jsx'
import MaintenancePage from './views/shop/pages/MaintenancePage.jsx'
import AdminShell from './views/admin/layouts/AdminShell.jsx'
import AdminLogin from './views/admin/pages/AdminLogin.jsx'
import AdminDashboard from './views/admin/pages/AdminDashboard.jsx'
import AdminProducts from './views/admin/pages/AdminProducts.jsx'
import AdminProductForm from './views/admin/pages/AdminProductForm.jsx'
import AdminCategories from './views/admin/pages/AdminCategories.jsx'
import AdminCategoryDetail from './views/admin/pages/AdminCategoryDetail.jsx'
import AdminOrders from './views/admin/pages/AdminOrders.jsx'
import AdminOrderDetail from './views/admin/pages/AdminOrderDetail.jsx'
import AdminInventory from './views/admin/pages/AdminInventory.jsx'
import { ADMIN_KEY, adminBase } from './config/adminPath.js'
import ErrorBoundary from './views/ui/ErrorBoundary.jsx'
import OfflineBanner from './views/ui/OfflineBanner.jsx'
import MaintenanceGate from './views/ui/MaintenanceGate.jsx'
import { ErrorFrame } from './views/ui/ApiStatusScreen.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <OfflineBanner />
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
              <Route path="*" element={<NotFoundPage />} />
            </Route>

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
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
