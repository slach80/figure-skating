'use client'

import Link from 'next/link'
import { useSiteConfig, usePublicAnnouncements, usePublicCoaches } from '@/hooks/useWebsite'

export default function HomePage() {
  const { data: config } = useSiteConfig()
  const { data: announcements = [] } = usePublicAnnouncements()
  const { data: coaches = [] } = usePublicCoaches()

  const latestAnnouncements = announcements.slice(0, 3)

  return (
    <div className="bg-gray-50">

      {/* Hero */}
      <section
        className="text-white py-32 md:py-40"
        style={{
          background: 'linear-gradient(135deg, rgba(91,44,145,0.97) 0%, rgba(184,230,240,0.85) 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-white/70 mb-4">
              ISI &amp; US Figure Skating Affiliated
            </p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Welcome to Line Creek<br />
              <span className="text-accent">Figure Skating Club</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-white/80 max-w-3xl mx-auto">
              {config?.tagline ||
                'Ice Skating Institute and US Figure Skating affiliated club dedicated to providing a safe and supportive environment for skaters of all ages and levels'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-accent text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-500 transition-all transform hover:scale-105 shadow-xl"
              >
                Explore Programs ↓
              </Link>
              <Link
                href="/contact"
                className="bg-white text-primary px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
              >
                Contact Us
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <div className="text-4xl font-bold text-accent">15+</div>
                <div className="text-white/70 text-sm mt-1">Years Experience</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <div className="text-4xl font-bold text-accent">100+</div>
                <div className="text-white/70 text-sm mt-1">Active Skaters</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <div className="text-4xl font-bold text-accent">{coaches.length > 0 ? `${coaches.length}+` : '10+'}</div>
                <div className="text-white/70 text-sm mt-1">Expert Coaches</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link href="/about" className="group bg-gradient-to-br from-primary to-[#412069] text-white rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">ℹ️</div>
              <h3 className="text-2xl font-bold mb-2">About</h3>
              <p className="text-white/80">Learn about our club, mission, and skating community</p>
            </Link>

            <Link href="/contact" className="group bg-gradient-to-br from-accent to-purple-600 text-white rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">Fall Fling</h3>
              <p className="text-white/80">Join us for our annual Fall Fling competition</p>
            </Link>

            <Link href="/register" className="group bg-gradient-to-br from-[#B8E6F0] to-cyan-400 text-gray-900 rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-2xl font-bold mb-2">Club Membership</h3>
              <p className="text-gray-700">Become a member and join our skating family</p>
            </Link>

            <Link href="/coaches" className="group bg-gradient-to-br from-[#E0BBE4] to-purple-300 text-gray-900 rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-2xl font-bold mb-2">Synchronized Skating</h3>
              <p className="text-gray-700">KC MOMENTUM — our competitive synchro team</p>
            </Link>

            <Link href="/register" className="group bg-gradient-to-br from-[#7B4DB8] to-primary text-white rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">⛸️</div>
              <h3 className="text-2xl font-bold mb-2">Programs</h3>
              <p className="text-white/80">Lessons and programs for all ages and skill levels</p>
            </Link>

            <Link href="/coaches" className="group bg-gradient-to-br from-gray-800 to-gray-600 text-white rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold mb-2">Coaches</h3>
              <p className="text-white/80">Meet our experienced coaching staff</p>
            </Link>
          </div>
        </div>
      </section>

      {/* News */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Latest News</h2>
            <p className="text-xl text-gray-600">Stay updated with club announcements and events</p>
          </div>

          {latestAnnouncements.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {latestAnnouncements.map((a, i) => {
                const gradients = [
                  'from-primary to-accent',
                  'from-accent to-pink-600',
                  'from-[#B8E6F0] to-cyan-500',
                ]
                const emojis = ['📢', '🎉', '⛸️']
                return (
                  <div key={a.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                    <div className={`h-48 bg-gradient-to-br ${gradients[i % 3]} flex items-center justify-center`}>
                      <span className="text-7xl">{emojis[i % 3]}</span>
                    </div>
                    <div className="p-6">
                      {a.published_at && (
                        <div className="text-sm text-gray-500 mb-2">
                          {new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{a.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{a.body}</p>
                      <span className="text-accent font-semibold">Learn More →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Placeholder cards when no announcements yet */
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { emoji: '🌸', gradient: 'from-primary to-accent', date: 'Coming soon', title: '2025 Spring Showcase', body: 'Registration opens soon for our Annual Spring Show! Watch this space for updates.' },
                { emoji: '🐭', gradient: 'from-accent to-pink-600', date: 'Coming soon', title: 'Save the Date — Mouse Races!', body: 'Mark your calendars for our annual Mouse Races fundraiser at Tiffany Greens Golf Club.' },
                { emoji: '⛸️', gradient: 'from-[#B8E6F0] to-cyan-500', date: 'Coming soon', title: 'KC MOMENTUM Skating Skills Classes', body: 'Moves in the Field and ice dance classes for youth and adult tracks. More details coming!' },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                  <div className={`h-48 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <span className="text-7xl">{item.emoji}</span>
                  </div>
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">{item.date}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600 mb-4">{item.body}</p>
                    <span className="text-accent font-semibold">Learn More →</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/about" className="inline-block bg-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-[#412069] transition shadow-lg">
              More News →
            </Link>
          </div>
        </div>
      </section>

      {/* About / Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <div className="space-y-4 text-lg text-gray-700">
                {config?.about_text ? (
                  <p>{config.about_text}</p>
                ) : (
                  <>
                    <p>Line Creek Figure Skating Club is an Ice Skating Institute and US Figure Skating affiliated club dedicated to providing a safe and supportive environment.</p>
                    <p>We welcome skaters of all ages and levels to reach their goals at the Line Creek Community Center in Kansas City, MO.</p>
                    <p>Whether you&apos;re taking your first steps on the ice or training for competitions, our experienced coaches and supportive community are here to help you succeed.</p>
                  </>
                )}
              </div>
              <div className="mt-8 flex gap-4">
                <Link href="/about" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-[#412069] transition">
                  Learn More
                </Link>
                <Link href="/coaches" className="px-6 py-3 border border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition">
                  Meet Our Coaches
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary to-accent rounded-2xl h-96 flex items-center justify-center text-9xl shadow-2xl">
                ⛸️
              </div>
              <div className="absolute -bottom-6 -left-6 bg-accent text-white p-6 rounded-2xl shadow-xl">
                <div className="text-3xl font-bold">15+ Years</div>
                <div className="text-lg">Serving KC Skaters</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-gradient-to-r from-primary to-[#412069] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h2>
            <p className="text-xl text-white/80">Get in touch with Line Creek FSC</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
              <div className="text-4xl mb-4">🕐</div>
              <h3 className="text-2xl font-bold mb-4">Hours</h3>
              <div className="space-y-2 text-white/80">
                <div className="flex justify-between"><span>Sun</span><span>09:00 AM – 04:00 PM</span></div>
                <div className="flex justify-between"><span>Mon–Fri</span><span>09:00 AM – 06:00 PM</span></div>
                <div className="flex justify-between"><span>Sat</span><span>09:00 AM – 04:00 PM</span></div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-2xl font-bold mb-4">Address</h3>
              <p className="text-white/80">
                {config?.address || '5940 NW Waukomis Dr\nKansas City, Missouri 64151'}
              </p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=5940+NW+Waukomis+Dr+Kansas+City+MO+64151"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-accent text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition"
              >
                Get Directions →
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="text-2xl font-bold mb-4">Email</h3>
              <a
                href={`mailto:${config?.contact_email || 'kclcfscboard@gmail.com'}`}
                className="text-accent hover:text-purple-300 text-lg"
              >
                {config?.contact_email || 'kclcfscboard@gmail.com'}
              </a>
              <div className="mt-6">
                <h4 className="font-bold mb-3">Social Media</h4>
                <div className="flex gap-4">
                  {config?.facebook_url ? (
                    <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-accent transition">📘</a>
                  ) : (
                    <a href="https://www.facebook.com/Line-Creek-Figure-Skating-Club-191282320943108" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-accent transition">📘</a>
                  )}
                  {config?.instagram_url ? (
                    <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-accent transition">📷</a>
                  ) : (
                    <a href="https://www.instagram.com/linecreekfsc" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-accent transition">📷</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
