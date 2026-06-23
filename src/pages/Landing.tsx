import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Building2, Ship, Crown, Briefcase, MessageSquareX, ShoppingCart,
  FileX, EyeOff, CalendarDays, Users, ConciergeBell, BarChart3,
  Handshake, Sparkles, FileText, CreditCard, Calendar, Wrench,
  ChefHat, Car, Sailboat, Heart, ShoppingBag, Shield, PartyPopper,
  Package, Plane, Check, ArrowRight
} from 'lucide-react'

export function Landing() {
  return (
    <div className="dark bg-background text-foreground min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-6">
          <span className="text-base font-bold tracking-tight">butlr</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#profiles" className="hover:text-foreground transition-colors">For whom</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/early-access">
            <Button size="sm">Request a demo</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-4">
              OPERATING SYSTEM
            </p>
            <h1 className="text-[clamp(42px,7vw,72px)] font-extrabold leading-[1.0] tracking-tight mb-6">
              The private operating system for luxury stays
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              My Butlr helps villas, yachts, conciergeries and family offices manage bookings, guest services, operations and premium upsells from one elegant platform.
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
          </div>
          <div className="hidden lg:block">
            <div className="bg-secondary/50 border border-border rounded-lg p-6 aspect-[4/3] flex items-center justify-center">
              <div className="w-full space-y-4">
                <div className="flex gap-3">
                  {['Active stays', 'Revenue', 'Requests'].map(label => (
                    <div key={label} className="flex-1 bg-card border border-border rounded-md p-4">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="text-xl font-mono font-medium mt-1">
                        {label === 'Active stays' ? '3' : label === 'Revenue' ? '€42K' : '7'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-card border border-border rounded-md p-4 space-y-2">
                  {['Laurent - Villa French Way', 'Dubois - Yacht Caribbean', 'Anderson - Mauritius'].map(item => (
                    <div key={item} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm">{item}</span>
                      <span className="text-xs font-mono text-muted-foreground">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground text-center mb-8">
            BUILT FOR
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Building2, label: 'Villas' },
              { icon: Ship, label: 'Yachts' },
              { icon: Crown, label: 'Conciergeries' },
              { icon: Briefcase, label: 'Family Offices' },
            ].map(item => (
              <Card key={item.label} className="p-6 text-center hover:bg-muted/50 transition-colors">
                <item.icon className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">{item.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight mb-4">
            Luxury stays are still managed with fragmented tools
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Owners, agencies and house managers juggle WhatsApp, PDFs, Excel, emails and manual follow-ups daily.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: MessageSquareX, label: 'Lost guest requests' },
              { icon: ShoppingCart, label: 'No centralized service catalog' },
              { icon: FileX, label: 'Manual payments and contracts' },
              { icon: EyeOff, label: 'Limited visibility for owners' },
            ].map(item => (
              <Card key={item.label} className="p-5 text-left">
                <item.icon className="w-5 h-5 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">{item.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution - Journey */}
      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight mb-12">
            One platform for the entire guest journey
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { phase: 'Before stay', items: ['Reservation', 'Contract', 'Deposit', 'Guest profile', 'Pre-stocking'] },
              { phase: 'During stay', items: ['Services', 'Requests', 'Staff tasks', 'Concierge', 'Maintenance'] },
              { phase: 'After stay', items: ['Feedback', 'Reporting', 'Future bookings', 'Partner offers'] },
            ].map(phase => (
              <div key={phase.phase} className="border border-border rounded-lg p-6 text-left">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-4">{phase.phase}</p>
                <ul className="space-y-2">
                  {phase.items.map(item => (
                    <li key={item} className="text-sm flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Platform
          </h2>
          <p className="text-center text-muted-foreground mb-12">Everything luxury operations need, unified.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CalendarDays, label: 'Simple PMS' },
              { icon: Users, label: 'Guest Portal' },
              { icon: ConciergeBell, label: 'Service Marketplace' },
              { icon: Wrench, label: 'House Manager Dashboard' },
              { icon: BarChart3, label: 'Owner Reporting' },
              { icon: MessageSquareX, label: 'Concierge Requests' },
              { icon: Handshake, label: 'Partner Network' },
              { icon: Sparkles, label: 'Smart Upsells' },
              { icon: FileText, label: 'Digital Contracts' },
              { icon: CreditCard, label: 'Payments & Deposits' },
              { icon: Calendar, label: 'Calendar Management' },
              { icon: Wrench, label: 'Maintenance & Housekeeping' },
            ].map(item => (
              <Card key={item.label} className="p-5 hover:bg-muted/50 transition-colors">
                <item.icon className="w-5 h-5 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">{item.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue */}
      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight mb-4">
            Unlock new revenue from every stay
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Guests book services directly from the portal. Each booking generates revenue through commissions, service fees and partner offers.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: ChefHat, label: 'Private Chef' },
              { icon: Car, label: 'Chauffeur' },
              { icon: Sailboat, label: 'Boat Rental' },
              { icon: Heart, label: 'Wellness' },
              { icon: ShoppingBag, label: 'Private Shopping' },
              { icon: PartyPopper, label: 'Event Planning' },
              { icon: Shield, label: 'Security' },
              { icon: Car, label: 'Car Rental' },
              { icon: Package, label: 'Pre-stocking' },
              { icon: Plane, label: 'Airport Transfer' },
            ].map(item => (
              <div key={item.label} className="border border-border rounded-md p-4 text-center">
                <item.icon className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-medium">{item.label}</p>
              </div>
            ))}
          </div>
          <Card className="mt-8 p-6 max-w-lg mx-auto">
            <p className="text-sm text-muted-foreground">
              A guest spending <span className="text-foreground font-mono font-medium">€2,000</span> in services generates platform revenue through commissions, service fees and partner offers.
            </p>
          </Card>
        </div>
      </section>

      {/* User Profiles */}
      <section id="profiles" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-12">
            For every stakeholder
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: 'Owners', desc: 'Monitor bookings, revenue, operations and guest satisfaction' },
              { role: 'House Managers', desc: 'Manage tasks, arrivals, maintenance and requests' },
              { role: 'Guests', desc: 'Book services, access villa information and request help' },
              { role: 'Partners', desc: 'Receive qualified luxury service requests' },
              { role: 'Agencies', desc: 'Follow reservations and promote selected properties' },
              { role: 'Conciergeries', desc: 'Coordinate services and manage the guest experience' },
            ].map(item => (
              <Card key={item.role} className="p-6">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-2">{item.role}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight text-center mb-4">
            Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12">Simple plans for every scale of operation.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Essential',
                desc: 'For one property',
                price: '€149',
                features: ['Booking calendar', 'Guest portal', 'Service catalog', 'Basic reporting'],
              },
              {
                name: 'Pro',
                desc: 'For premium villas and small portfolios',
                price: '€299',
                features: ['PMS', 'Partner marketplace', 'Payments', 'Contracts', 'Team management', 'Owner dashboard'],
              },
              {
                name: 'Enterprise',
                desc: 'For conciergeries, family offices and agencies',
                price: 'Custom',
                features: ['Multi-property management', 'White-label portal', 'Advanced permissions', 'Integrations', 'Dedicated support'],
              },
            ].map(plan => (
              <Card key={plan.name} className="p-6 flex flex-col">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-1">{plan.name}</p>
                <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                <p className="text-3xl font-mono font-medium mb-1">{plan.price}</p>
                {plan.price !== 'Custom' && <p className="text-xs text-muted-foreground mb-6">/month</p>}
                {plan.price === 'Custom' && <p className="text-xs text-muted-foreground mb-6">Contact us</p>}
                <ul className="space-y-2 mt-auto">
                  {plan.features.map(f => (
                    <li key={f} className="text-sm flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Optional Revenue</p>
            <p className="text-sm text-muted-foreground">Commission on services · Paid partner placements · Premium marketplace access · Special operation campaigns</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-extrabold leading-tight mb-6">
            Bring luxury operations into one private platform
          </h2>
          <Link to="/early-access">
            <Button size="lg">Request early access</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-start gap-8">
          <div>
            <span className="text-base font-bold tracking-tight">butlr</span>
            <p className="text-xs text-muted-foreground mt-2">The private operating system for luxury stays.</p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Villas</a>
            <a href="#" className="hover:text-foreground transition-colors">Yachts</a>
            <a href="#" className="hover:text-foreground transition-colors">Conciergeries</a>
            <a href="#" className="hover:text-foreground transition-colors">Owners</a>
            <a href="#" className="hover:text-foreground transition-colors">Partners</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            <a href="#" className="hover:text-foreground transition-colors">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
