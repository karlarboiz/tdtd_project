import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col py-6 lg:max-w-xl lg:py-10">
      <header className="w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Teacher&apos;s Dilemma Today
        </h1>
      </header>

      <main className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col items-stretch gap-4 lg:mt-14 lg:max-w-xl">
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

        <Link
          to="/subjects"
          className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-center text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Subjects
        </Link>
      </main>
    </div>
  )
}
