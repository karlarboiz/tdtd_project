import type { ReactNode } from 'react'
import { AppBrand } from '@/components/AppBrand/AppBrand'
import { bodyMutedClass } from '@/lib/uiClasses'

const APP_NAME = "Teacher's Dilemma Today"
const TAGLINE =
  'Attendance, classes, and scores — organized for your classroom.'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

function AuthBrandPanel() {
  return (
    <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary p-10 text-center lg:flex">
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-12 h-56 w-56 rounded-full bg-secondary/30 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-4">
        <AppBrand variant="hero" />
        <p className="text-xl font-semibold text-white">{APP_NAME}</p>
        <p className="max-w-xs text-sm text-white/80">{TAGLINE}</p>
      </div>
    </div>
  )
}

function AuthMobileBrandHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 lg:hidden">
      <AppBrand className="h-16 w-16 shrink-0 rounded-xl object-contain" />
      <div>
        <p className="text-base font-semibold text-slate-900">{APP_NAME}</p>
        <p className="text-xs text-slate-600">{TAGLINE}</p>
      </div>
    </div>
  )
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-bg px-4 py-8 sm:py-12">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg lg:grid lg:grid-cols-[2fr_2.2fr]">
        <AuthBrandPanel />
        <div className="p-6 lg:p-8">
          <AuthMobileBrandHeader />
          <header className="mt-6 lg:mt-0">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className={`mt-1 ${bodyMutedClass}`}>{subtitle}</p>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
