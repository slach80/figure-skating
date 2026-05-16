import type { ReactNode } from 'react'

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛸</span>
            <div>
              <p className="font-serif font-bold text-slate-900 leading-tight">Line Creek FSC</p>
              <p className="text-xs text-slate-500">Member Portal</p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
