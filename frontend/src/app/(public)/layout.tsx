import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl select-none">⛸</span>
            <span className="font-serif font-bold text-lg text-slate-900 leading-tight">Line Creek FSC</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/home" className="hover:text-slate-900 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
            <Link href="/coaches" className="hover:text-slate-900 transition-colors">Coaches</Link>
            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
          </nav>

          <Link
            href="/login"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Member Login
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⛸</span>
            <span className="font-serif text-white font-semibold">Line Creek FSC</span>
          </div>
          <p className="text-slate-500">© {new Date().getFullYear()} Line Creek Figure Skating Club. All rights reserved.</p>
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors">Member Login</Link>
        </div>
      </footer>
    </div>
  )
}
