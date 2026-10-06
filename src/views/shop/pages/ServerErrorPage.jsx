import ErrorScreen from '../../ui/ErrorScreen'

export default function ServerErrorPage({ onRetry }) {
  return (
    <ErrorScreen
      code="500"
      title="Server error"
      message="Something went wrong on our side. Retry, or contact us if it continues."
      showRetry
      onRetry={onRetry}
      showContact
    />
  )
}
