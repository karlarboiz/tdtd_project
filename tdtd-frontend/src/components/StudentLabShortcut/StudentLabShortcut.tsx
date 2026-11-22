import { Link } from 'react-router-dom'

export function StudentLabShortcut() {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-labelledby="student-lab-shortcut-heading"
    >
      <h2
        id="student-lab-shortcut-heading"
        className="text-base font-semibold text-slate-900"
      >
        Student Lab
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Look up a student&apos;s profile, attendance pattern, and recent quiz,
        exam, and participation scores.
      </p>
      <Link
        to="/student-lab"
        className="mt-4 inline-block text-sm font-semibold text-secondary hover:underline"
      >
        Open Student Lab →
      </Link>
    </section>
  )
}
