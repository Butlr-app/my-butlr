/** Mobile Boutique design tokens — aligned with guest portal mockups */
export const boutiqueMobile = {
  bg: 'bg-white',
  screen: 'bg-white text-[#1A1614]',
  title: 'text-[26px] font-bold tracking-tight text-[#1A1614]',
  subtitle: 'text-[13px] text-[#8E8E93]',
  body: 'text-[15px] leading-relaxed text-[#5C534C]',
  label: 'text-[12px] text-[#8E8E93]',
  value: 'text-[16px] font-medium text-[#1A1614]',
  divider: 'border-b border-[#E5E5EA]',
  search: 'flex items-center gap-2 rounded-xl bg-[#F2F2F7] px-3.5 py-2.5',
  searchInput: 'flex-1 bg-transparent text-[15px] text-[#1A1614] placeholder:text-[#8E8E93] outline-none',
  listRow: 'flex w-full items-center gap-3 py-3.5 text-left active:opacity-70',
  thumb: 'h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F2F2F7]',
  card: 'rounded-2xl bg-white',
  cardSoft: 'rounded-2xl bg-[#FAFAFA]',
  goldBtn:
    'flex w-full items-center justify-center rounded-full bg-[#C9AD7F] py-4 text-[16px] font-semibold text-[#1A1614] transition active:scale-[0.98] disabled:opacity-50',
  ghostBtn:
    'flex w-full items-center justify-center rounded-full border border-[#E5E5EA] py-4 text-[16px] font-medium text-[#1A1614]',
  tabActive: 'border-b-2 border-[#C9AD7F] pb-2 text-[15px] font-semibold text-[#1A1614]',
  tabIdle: 'pb-2 text-[15px] text-[#8E8E93]',
  stepBadge: 'text-[13px] font-medium text-[#8E8E93]',
  stickyFooter: 'sticky bottom-0 border-t border-[#E5E5EA] bg-white px-4 pb-4 pt-3',
  iconCircle: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5EDE3]',
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
