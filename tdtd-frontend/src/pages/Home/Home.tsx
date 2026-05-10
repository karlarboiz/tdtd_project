import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-neutral-bg px-4 py-10">
      <header className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Teacher&apos;s Dilemma Today
        </h1>
        <p className="mt-2 text-slate-600">
          Daily attendance — morning and afternoon, built for speed.
        </p>
      </header>

      <main className="mx-auto mt-12 flex w-full max-w-md flex-1 flex-col items-stretch gap-4">
        <Link
          to="/attendance"
          className="rounded-2xl bg-primary px-5 py-4 text-center text-lg font-semibold text-white shadow-md transition hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Start Attendance
        </Link>

        <Link
          to="/classes"
          className="rounded-2xl border-2 border-secondary bg-white px-5 py-4 text-center text-lg font-semibold text-secondary shadow-sm transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Classes &amp; students
        </Link>
      </main>
    </div>
  )
}
