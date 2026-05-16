'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logout } from '@/lib/auth'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-red-900 text-slate-200"
    >
      <LogOut size={18} />
      Logout
    </button>
  )
}
