import ErrorScreen from '../../ui/ErrorScreen'

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      code="403"
      title="Access denied"
      message="You need to sign in, or you do not have permission for this page."
      showLogin
      extra={
        <p className="mt-6 text-sm text-white/45">
          Need access?{' '}
          <a className="text-[#c5a059] underline" href="mailto:invihub@gmail.com">
            Request permission
          </a>
        </p>
      }
    />
  )
}
