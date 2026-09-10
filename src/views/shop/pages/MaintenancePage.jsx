import ErrorScreen from '../../ui/ErrorScreen'

export default function MaintenancePage() {
  return (
    <ErrorScreen
      code="503"
      title="We’ll be back shortly"
      message="The shop is down for maintenance. Check status, then retry when we are online again."
      showRetry
      extra={
        <p className="mt-6 text-sm text-white/45">
          Status:{' '}
          <button type="button" className="text-[#c5a059] underline" onClick={() => window.location.reload()}>
            Retry health check
          </button>
        </p>
      }
    />
  )
}
