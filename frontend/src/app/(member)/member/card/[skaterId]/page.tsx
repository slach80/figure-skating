'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { ChevronLeft, Download } from 'lucide-react'
import { useMembershipCard } from '@/hooks/useMembershipCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import type { MembershipCardData } from '@/types/skater'

// ── QR canvas ────────────────────────────────────────────────────────────────

function QRCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    QRCode.toCanvas(canvas, value, {
      width: 100,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).catch(() => {
      // silently ignore — QR is decorative fallback
    })
  }, [value])

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={100}
      aria-label="QR code"
      className="rounded-lg"
    />
  )
}

// ── Logo with text fallback ───────────────────────────────────────────────────

function ClubLogo({ src, clubName }: { src: string | null; clubName: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className="text-white/80 font-serif font-bold text-sm leading-tight">
        {clubName}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={clubName}
      className="h-9 w-auto object-contain"
      onError={() => setFailed(true)}
    />
  )
}

// ── Expiry badge ──────────────────────────────────────────────────────────────

function expiryLabel(expiry: string | null): string {
  if (!expiry) return 'No expiry date'
  const date = new Date(expiry + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ── Physical card ─────────────────────────────────────────────────────────────

function PhysicalCard({ card }: { card: MembershipCardData }) {
  const qrValue = [
    card.usfs_number ? `USFS:${card.usfs_number}` : '',
    `ID:${card.id}`,
  ]
    .filter(Boolean)
    .join('|')

  const bgColor = card.club.primary_color || '#5B2C91'
  const accentColor = card.club.accent_color || '#D946EF'

  const isExpired =
    card.membership_expiry !== null &&
    new Date(card.membership_expiry + 'T00:00:00') < new Date()

  return (
    /*
     * Credit-card aspect ratio: ISO/IEC 7810 ID-1 = 85.6 × 54 mm ≈ 1.586 : 1
     * We fix width at 100% of parent (capped at 420 px) and derive height via
     * aspect-ratio CSS so the card scales cleanly on every screen.
     */
    <div
      className="relative w-full max-w-sm mx-auto rounded-2xl shadow-2xl overflow-hidden select-none"
      style={{
        aspectRatio: '1.586',
        background: `linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 100%)`,
      }}
      aria-label="Membership card"
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: '#ffffff' }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full opacity-10"
        style={{ background: '#ffffff' }}
      />

      {/* Card body — padding scales proportionally */}
      <div className="absolute inset-0 flex flex-col p-[6%]">
        {/* Top row: logo + skater name */}
        <div className="flex items-start justify-between mb-auto">
          <ClubLogo src={card.club.logo} clubName={card.club.name} />
          <div className="text-right">
            <p className="text-white/60 text-[0.6rem] font-medium uppercase tracking-widest leading-none mb-0.5">
              Member
            </p>
            <p className="text-white font-bold text-base leading-tight">
              {card.first_name} {card.last_name}
            </p>
          </div>
        </div>

        {/* Middle: USFS number + membership type */}
        <div className="flex items-end justify-between mt-auto">
          <div className="space-y-2">
            {card.usfs_number && (
              <div>
                <p className="text-white/50 text-[0.55rem] uppercase tracking-widest">
                  USFS Number
                </p>
                <p className="text-white font-mono font-semibold text-sm tracking-wider">
                  {card.usfs_number}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {card.membership_type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wide bg-white/20 text-white backdrop-blur-sm">
                  {card.membership_type.name}
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wide bg-red-500/60 text-white">
                  Expired
                </span>
              )}
            </div>

            <div>
              <p className="text-white/50 text-[0.55rem] uppercase tracking-widest">
                {isExpired ? 'Expired' : 'Valid Through'}
              </p>
              <p
                className={`font-semibold text-xs ${
                  isExpired ? 'text-red-300' : 'text-white'
                }`}
              >
                {expiryLabel(card.membership_expiry)}
              </p>
            </div>
          </div>

          {/* QR code */}
          <div className="shrink-0">
            <QRCanvas value={qrValue} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MemberCardDetailPage() {
  const params = useParams()
  const skaterId = typeof params.skaterId === 'string' ? params.skaterId : ''
  const { data: card, isLoading, error } = useMembershipCard(skaterId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 403) {
      return (
        <ErrorAlert message="You do not have permission to view this membership card." />
      )
    }
    if (status === 404) {
      return <ErrorAlert message="Skater not found." />
    }
    return <ErrorAlert message="Failed to load membership card." />
  }

  if (!card) return null

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/member/card"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={16} />
        All cards
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Membership Card</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {card.first_name} {card.last_name}
        </p>
      </div>

      {/* The card */}
      <PhysicalCard card={card} />

      {/* Details below the card */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
        <div className="px-5 py-3.5 flex justify-between">
          <span className="text-slate-500">Club</span>
          <span className="font-medium text-slate-900">{card.club.name}</span>
        </div>
        {card.usfs_number && (
          <div className="px-5 py-3.5 flex justify-between">
            <span className="text-slate-500">USFS Number</span>
            <span className="font-mono font-medium text-slate-900">{card.usfs_number}</span>
          </div>
        )}
        {card.membership_type && (
          <div className="px-5 py-3.5 flex justify-between">
            <span className="text-slate-500">Membership Type</span>
            <span className="font-medium text-slate-900">{card.membership_type.name}</span>
          </div>
        )}
        <div className="px-5 py-3.5 flex justify-between">
          <span className="text-slate-500">Valid Through</span>
          <span className="font-medium text-slate-900">
            {expiryLabel(card.membership_expiry)}
          </span>
        </div>
      </div>

      {/* Download hint */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-500">
        <Download size={16} className="shrink-0 text-slate-400" />
        <span>
          Add this page to your Home Screen for quick offline access to your membership card.
        </span>
      </div>
    </div>
  )
}
