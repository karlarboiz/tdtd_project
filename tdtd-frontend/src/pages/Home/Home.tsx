import { Link } from 'react-router-dom'
import { AppBrand } from '@/components/AppBrand/AppBrand'
import {
  primaryButtonClass,
  secondaryLinkTileClass,
} from '@/lib/uiClasses'

const tertiaryLinkClass =
  'rounded-2xl border-2 border-secondary bg-white px-5 py-4 text-center text-lg font-semibold text-secondary shadow-sm transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary'

export function Home() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col py-6 lg:max-w-2xl lg:py-10">
      <AppBrand variant="hero" />

      <main className="mx-auto mt-10 flex w-full flex-1 flex-col items-stretch gap-4 lg:mt-14">
        <Link
          to="/attendance"
          className={`rounded-2xl px-5 py-4 text-center text-lg ${primaryButtonClass}`}
        >
          Start Attendance
        </Link>

        <Link
          to="/classes"
          className={secondaryLinkTileClass}
        >
          Classes &amp; students
        </Link>

        <Link to="/subjects" className={tertiaryLinkClass}>
          Subjects
        </Link>

        <Link to="/scores" className={tertiaryLinkClass}>
          Scores
        </Link>

        <Link to="/student-lab" className={tertiaryLinkClass}>
          Student Lab
        </Link>
      </main>
    </div>
  )
}
