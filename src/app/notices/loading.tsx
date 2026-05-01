export default function NoticesLoading() {
  return (
    <main className="mx-auto max-w-[1160px] px-4 py-16 md:px-8 md:py-24">
      <div className="max-w-3xl animate-pulse space-y-5">
        <div className="h-8 w-36 rounded-full bg-muted" />
        <div className="h-14 w-64 rounded-xl bg-muted" />
        <div className="h-5 w-full max-w-xl rounded bg-muted" />
      </div>
      <div className="mt-12 grid gap-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-44 rounded-[1.5rem] border border-border bg-white" />
        ))}
      </div>
    </main>
  )
}
