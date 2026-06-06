import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppBrand } from '@/components/AppBrand/AppBrand'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'touch-manipulation rounded-lg text-sm font-semibold transition',
    'inline-flex min-h-11 w-full items-center justify-start px-4 py-2.5',
    'sm:min-h-10 sm:w-auto sm:px-3 sm:py-2',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-700 active:bg-slate-100 sm:hover:bg-slate-100',
  ].join(' ')

const recentsLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'touch-manipulation rounded-lg text-sm font-semibold transition',
    'inline-flex min-h-11 shrink-0 items-center justify-center px-3 py-2',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-700 active:bg-slate-100 hover:bg-slate-100',
  ].join(' ')

function NavMenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="h-6 w-6"
        aria-hidden
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className="flex min-h-svh flex-col bg-neutral-bg lg:h-svh lg:overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-3 sm:pb-4 lg:px-6 lg:pb-4">
          <div className="flex items-center justify-between gap-3">
            <AppBrand />
            <div className="flex shrink-0 items-center gap-1">
              <NavLink to="/recents" className={recentsLinkClass}>
                Recents
              </NavLink>
              <button
                type="button"
                className={recentsLinkClass({ isActive: false })}
                onClick={() => {
                  void logout().then(() => navigate('/login', { replace: true }))
                }}
              >
                Sign out{user ? ` (${user.firstName})` : ''}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:bg-slate-100"
                aria-expanded={navOpen}
                aria-controls="main-nav"
                aria-label={navOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setNavOpen((open) => !open)}
              >
                <NavMenuIcon open={navOpen} />
              </button>
            </div>
          </div>

          <nav
            id="main-nav"
            className={[
              'flex flex-col gap-1 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:gap-2',
              navOpen ? 'mt-3' : 'hidden',
            ].join(' ')}
            aria-label="Main"
          >
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/attendance" className={navLinkClass}>
              Attendance
            </NavLink>
            <NavLink to="/due-list" className={navLinkClass}>
              DueList
            </NavLink>
            <NavLink to="/classes" className={navLinkClass}>
              Classes &amp; Students
            </NavLink>
            <NavLink to="/subjects" className={navLinkClass}>
              Subjects
            </NavLink>
            <NavLink to="/scores" className={navLinkClass}>
              Scores
            </NavLink>
            <NavLink to="/student-lab" className={navLinkClass}>
              Student Lab
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
