import { useState } from 'react'
import { useGuides, type Guide } from '@/lib/useSupabase'
import { Loader2, BookOpen, Thermometer, Tv, Shield, UtensilsCrossed, Waves, Snowflake, Wifi, TreePine, KeyRound, SprayCan, Cog, ChevronLeft } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'spa', label: 'Spa' },
  { value: 'home_automation', label: 'Automation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'security', label: 'Security' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'pool', label: 'Pool' },
  { value: 'heating_cooling', label: 'Climate' },
  { value: 'wifi_tech', label: 'Wi-Fi' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'keys_access', label: 'Keys' },
  { value: 'cleaning', label: 'Cleaning' },
]

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  general: BookOpen,
  spa: Thermometer,
  home_automation: Cog,
  entertainment: Tv,
  security: Shield,
  kitchen: UtensilsCrossed,
  pool: Waves,
  heating_cooling: Snowflake,
  wifi_tech: Wifi,
  outdoor: TreePine,
  keys_access: KeyRound,
  cleaning: SprayCan,
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'from-slate-100 to-slate-50',
  spa: 'from-purple-100 to-purple-50',
  home_automation: 'from-blue-100 to-blue-50',
  entertainment: 'from-pink-100 to-pink-50',
  security: 'from-red-100 to-red-50',
  kitchen: 'from-orange-100 to-orange-50',
  pool: 'from-cyan-100 to-cyan-50',
  heating_cooling: 'from-indigo-100 to-indigo-50',
  wifi_tech: 'from-violet-100 to-violet-50',
  outdoor: 'from-green-100 to-green-50',
  keys_access: 'from-amber-100 to-amber-50',
  cleaning: 'from-teal-100 to-teal-50',
}

export function GuestGuides() {
  const { data: guides, loading } = useGuides()
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)

  const publishedGuides = guides.filter(g => g.published)

  const filtered = publishedGuides.filter(g => {
    if (activeCategory === 'all') return true
    return g.category === activeCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 tracking-wide">Loading guides...</p>
        </div>
      </div>
    )
  }

  if (selectedGuide) {
    const Icon = CATEGORY_ICONS[selectedGuide.category] || BookOpen
    return (
      <div className="min-h-screen bg-white">
        <div className={`bg-gradient-to-br ${CATEGORY_COLORS[selectedGuide.category] || 'from-slate-100 to-slate-50'} p-6 pb-8`}>
          <button
            onClick={() => setSelectedGuide(null)}
            className="flex items-center gap-1 text-sm text-gray-600 mb-4 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to guides
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
              <Icon className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{selectedGuide.title}</h1>
              <p className="text-xs text-gray-500 capitalize">{selectedGuide.category.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="prose prose-sm max-w-none">
            {(selectedGuide.content ?? '').split('\n').map((paragraph, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Property Guides</h1>
        <p className="text-sm text-gray-500">Instructions & tips for your stay</p>
      </div>

      <div className="px-5 mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No guides available yet.</p>
        </div>
      ) : (
        <div className="px-5 pb-24 space-y-3">
          {filtered.map(guide => {
            const Icon = CATEGORY_ICONS[guide.category] || BookOpen
            return (
              <button
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[guide.category] || 'from-slate-100 to-slate-50'} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{guide.title}</h3>
                    <p className="text-xs text-gray-500 capitalize mb-1">{guide.category.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{guide.content}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
