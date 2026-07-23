/** Mobile Boutique design tokens — aligned with guest portal mockups */
export const boutiqueMobile = {
  bg: 'bg-[#F6F1E9]',
  screen: 'bg-transparent text-[#071A2F]',
  title: "font-['Cormorant_Garamond',Georgia,serif] text-[30px] font-semibold leading-none tracking-[-0.02em] text-[#071A2F]",
  subtitle: 'text-[13px] leading-relaxed text-[#7B746C]',
  body: 'text-[15px] leading-relaxed text-[#4E4A45]',
  label: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B837A]',
  value: 'text-[16px] font-medium text-[#071A2F]',
  divider: 'border-b border-[#DED7CD]',
  search: 'flex items-center gap-2 rounded-xl border border-[#DED7CD] bg-white px-3.5 py-2.5',
  searchInput: 'flex-1 bg-transparent text-[15px] text-[#071A2F] placeholder:text-[#9B958E] outline-none',
  listRow: 'flex w-full items-center gap-3 py-3.5 text-left active:opacity-70',
  thumb: 'h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#EDE7DE]',
  card: 'rounded-2xl border border-[#E4DDD3] bg-white',
  cardSoft: 'rounded-2xl bg-[#EEE8DF]',
  goldBtn:
    'flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071A2F] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50',
  ghostBtn:
    'flex min-h-12 w-full items-center justify-center rounded-xl border border-[#D9D0C4] bg-white py-3.5 text-[15px] font-medium text-[#071A2F]',
  tabActive: 'border-b-2 border-[#C9AD7F] pb-2 text-[15px] font-semibold text-[#1A1614]',
  tabIdle: 'pb-2 text-[15px] text-[#8B837A]',
  stepBadge: 'text-[13px] font-medium text-[#8B837A]',
  stickyFooter: 'sticky bottom-0 border-t border-[#DED7CD] bg-[#F6F1E9]/95 px-4 pb-4 pt-3 backdrop-blur-xl',
  iconCircle: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEE7DB]',
  checkCircle: 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#34C759]',
} as const

export const categoryGradients: Record<string, string> = {
  'groceries-arrival': 'from-[#E8DFD4] to-[#B8956B]',
  'chef-dining': 'from-[#D4C4B0] to-[#8B7355]',
  transport: 'from-[#C5CDD8] to-[#6B7B8C]',
  wellness: 'from-[#E8D5E0] to-[#A67B8C]',
  experiences: 'from-[#C5D8E8] to-[#5B7B9A]',
  'home-comfort': 'from-[#E5E0D8] to-[#9A8B7A]',
  events: 'from-[#E8D8C5] to-[#A6896B]',
  'premium-shopping': 'from-[#D8C5E8] to-[#8B6B9A]',
}

export function itemPlaceholderGradient(categorySlug: string): string {
  return categoryGradients[categorySlug] ?? 'from-[#E8DFD4] to-[#B8956B]'
}
