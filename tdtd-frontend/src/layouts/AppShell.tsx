import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'touch-manipulation rounded-lg text-sm font-semibold transition',
    'inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5',
    'sm:min-h-10 sm:w-auto sm:justify-start sm:px-3 sm:py-2',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-700 active:bg-slate-100 sm:hover:bg-slate-100',
  ].join(' ')

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-neutral-bg lg:h-svh lg:overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-3 sm:pb-4 lg:px-6 lg:pb-4">
          <p className="text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-base">
            Teacher&apos;s Dilemma Today
          </p>
          <nav
            className="flex flex-col gap-1 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:gap-2 sm:border-t-0 sm:pt-0"
            aria-label="Main"
          >
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/attendance" className={navLinkClass}>
              Attendance
            </NavLink>
            <NavLink to="/classes" className={navLinkClass}>
              Classes &amp; students
            </NavLink>
            <NavLink to="/subjects" className={navLinkClass}>
              Subjects
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 lg:px-6 lg:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
