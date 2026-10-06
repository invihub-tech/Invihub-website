import ErrorScreen from './ErrorScreen'
import NotFoundPage from '../shop/pages/NotFoundPage'
import ForbiddenPage from '../shop/pages/ForbiddenPage'
import MaintenancePage from '../shop/pages/MaintenancePage'
import ServerErrorPage from '../shop/pages/ServerErrorPage'

export function ErrorFrame({ children }) {
  return <div className="min-h-screen bg-black text-white">{children}</div>
}

export function ApiStatusScreen({ status, onRetry }) {
  if (status === 404) return <NotFoundPage />
  if (status === 401 || status === 403) return <ForbiddenPage />
  if (status === 503) return <MaintenancePage />
  if (status === 0) {
    return (
      <ErrorScreen
        code="Offline"
        title="Cannot reach the shop"
        message="Check your connection, then retry."
        showRetry
        onRetry={onRetry}
      />
    )
  }
  return <ServerErrorPage onRetry={onRetry} />
}
