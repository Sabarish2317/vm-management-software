const ErrorComponent = () => {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-white px-6 text-center shadow-sm">
      <img
        src="/images/warning.png"
        alt="Error"
        className="h-14 w-14 opacity-90"
      />
      <h1 className="text-xl font-semibold text-zinc-800">
        Something didn’t go as planned
      </h1>
      <p className="max-w-sm text-sm text-zinc-500">
        We ran into an issue while processing your request. You can retry now or
        come back in a moment.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="flex cursor-pointer flex-row items-center gap-2 rounded-2xl bg-blue-100 px-5 py-3 text-sm font-medium text-blue-800 transition-all duration-200 ease-in-out hover:bg-blue-200 disabled:opacity-0"
        >
          Try Again
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          className="mr-4 flex cursor-pointer flex-row items-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-600 transition-all duration-200 ease-in-out hover:bg-gray-200 disabled:opacity-0"
        >
          Go Home
        </button>
      </div>
    </main>
  )
}

export default ErrorComponent
