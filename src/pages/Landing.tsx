import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Building2, Ship, Crown, Briefcase, MessageSquareX, ShoppingCart,
  FileX, EyeOff, CalendarDays, Users, ConciergeBell, BarChart3,
  Handshake, Sparkles, FileText, CreditCard,
  ChefHat, Car, Sailboat, Heart, ShoppingBag, Shield, PartyPopper,
  Package, Plane, Check, ArrowRight, Star, X,
  Zap, Eye, LayoutDashboard
} from 'lucide-react'

const serviceItems = [
  { icon: ChefHat, label: 'Private Chef', color: 'from-amber-500/20 to-orange-600/10', iconColor: 'text-amber-400', price: 'From €850' },
  { icon: Car, label: 'Chauffeur', color: 'from-slate-400/20 to-zinc-600/10', iconColor: 'text-slate-300', price: 'From €250' },
  { icon: Sailboat, label: 'Boat Rental', color: 'from-cyan-500/20 to-blue-600/10', iconColor: 'text-cyan-400', price: 'From €2,000' },
  { icon: Heart, label: 'Wellness & Spa', color: 'from-rose-500/20 to-pink-600/10', iconColor: 'text-rose-400', price: 'From €200' },
  { icon: ShoppingBag, label: 'Private Shopping', color: 'from-violet-500/20 to-purple-600/10', iconColor: 'text-violet-400', price: 'From €300' },
  { icon: PartyPopper, label: 'Event Planning', color: 'from-fuchsia-500/20 to-pink-600/10', iconColor: 'text-fuchsia-400', price: 'From €3,000' },
  { icon: Shield, label: 'Security', color: 'from-emerald-500/20 to-green-600/10', iconColor: 'text-emerald-400', price: 'From €1,500' },
  { icon: Plane, label: 'Airport Transfer', color: 'from-sky-500/20 to-blue-600/10', iconColor: 'text-sky-400', price: 'From €250' },
  { icon: Package, label: 'Pre-stocking', color: 'from-lime-500/20 to-green-600/10', iconColor: 'text-lime-400', price: 'From €400' },
  { icon: Car, label: 'Luxury Cars', color: 'from-yellow-500/20 to-amber-600/10', iconColor: 'text-yellow-400', price: 'From €500' },
]

export function Landing() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-6">
          <span className="text-base font-bold tracking-tight">butlr</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#portfolio" className="hover:text-foreground transition-colors">Portfolio</a>
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/early-access">
            <Button size="sm">Request a demo</Button>
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          1. HERO — Full-bleed photo + product preview
          ═══════════════════════════════════════════ */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <img src="/images/villa-hero.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative w-full">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-6">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-amber-400">Limited beta — Join now</span>
            </div>
            <h1 className="text-[clamp(38px,6.5vw,68px)] font-extrabold leading-[1.0] tracking-tight mb-6">
              The private operating system for luxury stays
            </h1>
            <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-lg">
              Manage bookings, guest services, staff operations and premium upsells from one elegant platform — built for villas, yachts and conciergeries.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/early-access">
                <Button size="lg">Request early access</Button>
              </Link>
              <Link to="/app">
                <Button variant="ghost" size="lg">
                  View platform <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border-2 border-background" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-0.5">Designed for luxury property managers</p>
              </div>
            </div>
          </div>

          {/* Product preview — desktop */}
          <div className="hidden lg:block">
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl">
              <div className="relative p-6 space-y-4">
                <div className="flex gap-3">
                  {[
                    { label: 'Active stays', value: '3', accent: 'border-emerald-500/30' },
                    { label: 'Revenue', value: '€42K', accent: 'border-amber-500/30' },
                    { label: 'Requests', value: '7', accent: 'border-sky-500/30' },
                  ].map(kpi => (
                    <div key={kpi.label} className={`flex-1 bg-white/5 border ${kpi.accent} rounded-lg p-4`}>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">{kpi.label}</p>
                      <p className="text-xl font-mono font-medium mt-1">{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                  {[
                    { name: 'Laurent — Villa French Way', status: 'Active', color: 'text-emerald-400' },
                    { name: 'Dubois — Yacht Caribbean', status: 'Arriving', color: 'text-amber-400' },
                    { name: 'Anderson — Mauritius', status: 'Active', color: 'text-emerald-400' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm">{item.name}</span>
                      <span className={`text-xs font-mono ${item.color}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product preview — mobile (compact KPI strip) */}
          <div className="lg:hidden mt-2">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl p-4">
              <div className="flex gap-3">
                {[
                  { label: 'Stays', value: '3', accent: 'border-emerald-500/30' },
                  { label: 'Revenue', value: '€42K', accent: 'border-amber-500/30' },
                  { label: 'Requests', value: '7', accent: 'border-sky-500/30' },
                ].map(kpi => (
                  <div key={kpi.label} className={`flex-1 bg-white/5 border ${kpi.accent} rounded-lg p-3 text-center`}>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-white/50">{kpi.label}</p>
                    <p className="text-lg font-mono font-medium mt-0.5">{kpi.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. BUILT FOR — 4 target personas with photos
          ═══════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground text-center mb-8">
            BUILT FOR
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Building2, label: 'Villas', desc: 'Luxury villas & estates', gradient: 'from-amber-500/10', img: '/images/luxury-interior.jpg' },
              { icon: Ship, label: 'Yachts', desc: 'Superyachts & charters', gradient: 'from-cyan-500/10', img: '/images/yacht.jpg' },
              { icon: Crown, label: 'Conciergeries', desc: 'Premium concierge firms', gradient: 'from-violet-500/10', img: '/images/concierge.jpg' },
              { icon: Briefcase, label: 'Family Offices', desc: 'Private wealth managers', gradient: 'from-emerald-500/10', img: '/images/villa-pool.jpg' },
            ].map(item => (
              <Card key={item.label} className={`overflow-hidden hover:bg-muted/50 transition-all bg-gradient-to-b ${item.gradient} to-transparent group`}>
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 text-center">
                  <item.icon className="w-6 h-6 mx-auto mb-2 text-foreground/80" />
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. PORTFOLIO — Moved up for immediate visual impact
          ═══════════════════════════════════════════ */}
      <section id="portfolio" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-amber-400 text-center mb-4">PORTFOLIO</p>
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Exceptional properties, managed effortlessly
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            From Mediterranean villas to Caribbean yachts, My Butlr adapts to every luxury property type.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: '/images/luxury-interior.jpg', name: 'Villa French Way', location: 'Saint-Tropez, France', specs: '6 bed · Pool · Sea view', tag: 'Villa', tagColor: 'bg-amber-500/20 text-amber-300' },
              { img: '/images/yacht.jpg', name: 'French West Yacht', location: 'Caribbean Sea', specs: '4 cabins · 42m · Full crew', tag: 'Yacht', tagColor: 'bg-cyan-500/20 text-cyan-300' },
              { img: '/images/beach-villa.jpg', name: 'Villa Mauritius', location: 'Ile Maurice', specs: '5 bed · Beach · Garden', tag: 'Villa', tagColor: 'bg-emerald-500/20 text-emerald-300' },
            ].map(property => (
              <div key={property.name} className="rounded-xl overflow-hidden border border-border group cursor-pointer hover:border-white/20 transition-colors">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={property.img} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full ${property.tagColor} backdrop-blur-sm`}>{property.tag}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-semibold">{property.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{property.location}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">{property.specs}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          4. PROBLEM + SOLUTION merged — Before/After side by side
          ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            From chaos to clarity
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
            Luxury stays are still managed with fragmented tools. My Butlr replaces them all.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-8">
              <div className="flex items-center gap-2 mb-6">
                <X className="w-5 h-5 text-red-400" />
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-red-400">Without My Butlr</p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: MessageSquareX, text: 'Guest requests lost in WhatsApp threads', color: 'text-red-400/70' },
                  { icon: ShoppingCart, text: 'No centralized service catalog for guests', color: 'text-red-400/70' },
                  { icon: FileX, text: 'Contracts and payments handled manually', color: 'text-red-400/70' },
                  { icon: EyeOff, text: 'Owners have zero visibility on operations', color: 'text-red-400/70' },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <item.icon className={`w-4 h-4 ${item.color} mt-0.5 shrink-0`} />
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-8">
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5 text-emerald-400" />
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-emerald-400">With My Butlr</p>
              </div>
              <div className="space-y-4">
                {[
                  { text: 'Every request tracked and assigned in real-time', color: 'text-emerald-400' },
                  { text: 'Guests browse and book services from their portal', color: 'text-emerald-400' },
                  { text: 'Digital contracts, deposits and invoicing in one click', color: 'text-emerald-400' },
                  { text: 'Full dashboard with revenue, bookings and performance', color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 ${item.color} mt-0.5 shrink-0`} />
                    <p className="text-sm text-foreground/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Journey strip */}
          <div className="mt-14 grid grid-cols-3 gap-4">
            {[
              { phase: 'Before stay', items: ['Reservation', 'Contract', 'Deposit', 'Pre-stocking'], color: 'border-t-amber-500/50', iconColor: 'text-amber-400' },
              { phase: 'During stay', items: ['Services', 'Requests', 'Concierge', 'Maintenance'], color: 'border-t-emerald-500/50', iconColor: 'text-emerald-400' },
              { phase: 'After stay', items: ['Feedback', 'Reporting', 'Future bookings'], color: 'border-t-sky-500/50', iconColor: 'text-sky-400' },
            ].map(phase => (
              <div key={phase.phase} className={`border border-border ${phase.color} border-t-2 rounded-lg p-5 bg-background/50`}>
                <p className={`text-xs font-mono font-medium uppercase tracking-[.14em] ${phase.iconColor} mb-3`}>{phase.phase}</p>
                <ul className="space-y-2">
                  {phase.items.map(item => (
                    <li key={item} className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Check className={`w-3 h-3 ${phase.iconColor}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. SERVICES — Photos + catalog + revenue callout
          ═══════════════════════════════════════════ */}
      <section id="services" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-rose-900/5" />
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Premium services at your guests' fingertips
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            A curated marketplace of luxury services your guests can book directly from their portal.
          </p>

          {/* Featured services with photos */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { img: '/images/chef.jpg', label: 'Private Chef', desc: 'World-class cuisine prepared in the comfort of your villa', price: 'From €850/evening', color: 'text-amber-400' },
              { img: '/images/spa.jpg', label: 'Wellness & Spa', desc: 'In-villa massages, yoga sessions, and holistic treatments', price: 'From €200/session', color: 'text-rose-400' },
              { img: '/images/boat.jpg', label: 'Boat Excursions', desc: 'Private yacht charters and sunset cruises along the coast', price: 'From €2,000/day', color: 'text-cyan-400' },
            ].map(service => (
              <div key={service.label} className="rounded-xl overflow-hidden border border-border group cursor-pointer hover:border-white/20 transition-colors">
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img src={service.img} alt={service.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className={`text-xs font-mono ${service.color}`}>{service.price}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-semibold">{service.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* All services grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {serviceItems.map(item => (
              <div key={item.label} className={`rounded-xl border border-border p-5 text-center bg-gradient-to-b ${item.color} hover:scale-[1.02] transition-all cursor-pointer`}>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{item.price}</p>
              </div>
            ))}
          </div>

          {/* Revenue callout */}
          <div className="mt-12 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-8 text-center">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-amber-400 mb-3">Revenue Potential</p>
            <p className="text-2xl font-bold mb-2">
              A guest spending <span className="text-amber-400 font-mono">€2,000</span> in services
            </p>
            <p className="text-muted-foreground">
              generates platform revenue through commissions, service fees and partner offers.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. GUEST EXPERIENCE — Photo + checklist
          ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-cyan-400 mb-4">GUEST EXPERIENCE</p>
              <h2 className="text-[clamp(30px,4.4vw,42px)] font-extrabold leading-tight mb-6">
                A seamless luxury experience for every guest
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                From pre-arrival preferences to real-time service requests, your guests access everything through an elegant digital portal.
              </p>
              <div className="space-y-4">
                {[
                  'Personalized welcome and villa information',
                  'One-tap service booking from curated catalog',
                  'Real-time concierge chat and request tracking',
                  'Local recommendations curated by your team',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group">
              <img src="/images/villa-pool.jpg" alt="Luxury villa with infinity pool" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-end p-8">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/80 mb-2">Villa French Way</p>
                  <p className="text-2xl font-bold">Saint-Tropez, France</p>
                  <p className="text-sm text-white/60 mt-1">6 bedrooms · Infinity pool · Sea view</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          7. PLATFORM — Reduced to 8 key features in 2 rows
          ═══════════════════════════════════════════ */}
      <section id="platform" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Everything you need, unified
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
            One platform replaces your PMS, CRM, task manager, payment system and guest portal.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: CalendarDays, label: 'Bookings & PMS', desc: 'Multi-property calendar, availability and reservation management', color: 'text-amber-400', bg: 'from-amber-500/10' },
              { icon: Users, label: 'Guest Portal', desc: 'Digital concierge where guests browse services and make requests', color: 'text-cyan-400', bg: 'from-cyan-500/10' },
              { icon: ConciergeBell, label: 'Service Marketplace', desc: 'Curated catalog of premium services with built-in commissions', color: 'text-rose-400', bg: 'from-rose-500/10' },
              { icon: LayoutDashboard, label: 'Operations Hub', desc: 'Tasks, maintenance, staff coordination and daily checklists', color: 'text-emerald-400', bg: 'from-emerald-500/10' },
              { icon: BarChart3, label: 'Owner Dashboard', desc: 'Revenue, occupancy, performance metrics and guest satisfaction', color: 'text-violet-400', bg: 'from-violet-500/10' },
              { icon: Handshake, label: 'Partner Network', desc: 'Qualified service providers connected to your properties', color: 'text-sky-400', bg: 'from-sky-500/10' },
              { icon: FileText, label: 'Contracts & Payments', desc: 'Digital contracts, e-signatures, deposits and invoicing', color: 'text-yellow-400', bg: 'from-yellow-500/10' },
              { icon: Sparkles, label: 'Smart Upsells', desc: 'Revenue optimization with contextual service recommendations', color: 'text-fuchsia-400', bg: 'from-fuchsia-500/10' },
            ].map(item => (
              <Card key={item.label} className={`p-6 bg-gradient-to-b ${item.bg} to-transparent hover:bg-muted/50 transition-all group`}>
                <item.icon className={`w-6 h-6 ${item.color} mb-4`} />
                <p className="text-sm font-semibold mb-1">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Eye className="w-4 h-4" />
              Explore the full platform demo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          8. STAKEHOLDERS — Enhanced with icons + CTAs
          ═══════════════════════════════════════════ */}
      <section id="profiles" className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            One platform, every role
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
            Each stakeholder gets a tailored view and the tools they need.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: CreditCard, role: 'Owners', desc: 'Real-time dashboards with revenue, occupancy and guest satisfaction metrics. Full visibility without the operational noise.', color: 'from-amber-500/10', iconColor: 'text-amber-400', borderColor: 'border-l-amber-500/40' },
              { icon: Briefcase, role: 'House Managers', desc: 'Daily task lists, maintenance tracking, arrival prep and staff coordination. Everything to run the property smoothly.', color: 'from-emerald-500/10', iconColor: 'text-emerald-400', borderColor: 'border-l-emerald-500/40' },
              { icon: Users, role: 'Guests', desc: 'Elegant portal to browse services, book experiences, chat with concierge and access villa information.', color: 'from-cyan-500/10', iconColor: 'text-cyan-400', borderColor: 'border-l-cyan-500/40' },
              { icon: Handshake, role: 'Partners', desc: 'Receive qualified service requests from luxury properties. Manage availability and respond directly.', color: 'from-violet-500/10', iconColor: 'text-violet-400', borderColor: 'border-l-violet-500/40' },
              { icon: Building2, role: 'Agencies', desc: 'Track reservations, manage client portfolios and promote properties to a qualified audience.', color: 'from-rose-500/10', iconColor: 'text-rose-400', borderColor: 'border-l-rose-500/40' },
              { icon: Crown, role: 'Conciergeries', desc: 'Orchestrate the entire guest experience: services, requests, partner coordination and follow-up.', color: 'from-sky-500/10', iconColor: 'text-sky-400', borderColor: 'border-l-sky-500/40' },
            ].map(item => (
              <Card key={item.role} className={`p-6 bg-gradient-to-b ${item.color} to-transparent border-l-2 ${item.borderColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  <p className={`text-xs font-mono font-medium uppercase tracking-[.14em] ${item.iconColor}`}>{item.role}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          9. PRICING — Simplified with "starting at" emphasis
          ═══════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-muted-foreground mb-14">No hidden fees. Cancel anytime. Start with a free trial.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Essential',
                desc: 'For a single property',
                price: '€149',
                features: ['Booking calendar', 'Guest portal', 'Service catalog', 'Basic reporting'],
                accent: '',
              },
              {
                name: 'Pro',
                desc: 'For premium villas and portfolios',
                price: '€299',
                features: ['Everything in Essential', 'Partner marketplace', 'Payments & contracts', 'Team management', 'Owner dashboard'],
                accent: 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent',
              },
              {
                name: 'Enterprise',
                desc: 'For conciergeries and agencies',
                price: 'Custom',
                features: ['Everything in Pro', 'Multi-property management', 'White-label portal', 'Integrations', 'Dedicated support'],
                accent: '',
              },
            ].map(plan => (
              <Card key={plan.name} className={`p-6 flex flex-col ${plan.accent}`}>
                {plan.name === 'Pro' && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 self-start mb-3">Most popular</span>
                )}
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-1">{plan.name}</p>
                <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                <p className="text-3xl font-mono font-medium mb-1">{plan.price}</p>
                {plan.price !== 'Custom' && <p className="text-xs text-muted-foreground mb-6">/month</p>}
                {plan.price === 'Custom' && <p className="text-xs text-muted-foreground mb-6">Contact us</p>}
                <ul className="space-y-2 mt-auto">
                  {plan.features.map(f => (
                    <li key={f} className="text-sm flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/early-access" className="mt-6">
                  <Button variant={plan.name === 'Pro' ? 'primary' : 'secondary'} size="sm" className="w-full">
                    {plan.price === 'Custom' ? 'Contact us' : 'Start free trial'}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Additional revenue from service commissions · partner placements · marketplace access
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          10. CTA FINAL — Inline email form + urgency
          ═══════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/beach-villa.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        </div>
        <div className="max-w-2xl mx-auto relative text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-6">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-amber-400">Limited beta spots</span>
          </div>
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight mb-4">
            Ready to transform your luxury operations?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Join the first property managers using My Butlr to deliver exceptional guest experiences.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 h-12 px-5 rounded-md bg-white/10 border border-white/20 text-foreground placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 text-sm"
              />
              <Button size="lg" type="submit">
                Get early access
              </Button>
            </form>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 max-w-md mx-auto">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold mb-1">You're on the list!</p>
              <p className="text-sm text-muted-foreground">We'll reach out shortly with your beta access.</p>
            </div>
          )}

          <p className="text-xs text-white/30 mt-4">No credit card required · Free trial included</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER — Fixed links
          ═══════════════════════════════════════════ */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-start gap-8">
          <div>
            <span className="text-base font-bold tracking-tight">butlr</span>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs">The private operating system for luxury stays.</p>
            <p className="text-xs text-muted-foreground mt-4">© {new Date().getFullYear()} My Butlr. All rights reserved.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-muted-foreground">
            <a href="#portfolio" className="hover:text-foreground transition-colors">Portfolio</a>
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#profiles" className="hover:text-foreground transition-colors">For whom</a>
            <Link to="/early-access" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
