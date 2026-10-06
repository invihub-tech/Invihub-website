import ErrorScreen from '../../ui/ErrorScreen'

export default function NotFoundPage() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      message="That address is not on this site. Search the shop or use the links below."
      showSearch
    />
  )
}
