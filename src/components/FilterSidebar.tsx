import { useState } from 'react'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Filter, X, ChevronDown, ChevronUp, Bookmark, Trash2 } from 'lucide-react'

interface FilterSidebarProps {
  page: 'properties' | 'reservations' | 'payments' | 'tasks'
  open: boolean
  onClose: () => void
}

export function FilterSidebar({ page, open, onClose }: FilterSidebarProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { filters, updateFilter, clearFilters, savedFilters, saveFilter, removeSavedFilter, loadSavedFilter } = useSearch()
  const [collapsed, setCollapsed] = useState(false)
  const [filterName, setFilterName] = useState('')

  const pageFilters = savedFilters.filter(f => f.page === page)

  const handleSave = () => {
    if (!filterName.trim()) return
    saveFilter(filterName.trim(), page)
    setFilterName('')
    toast(t('toast.filterSaved'), 'success')
  }

  if (!open) return null

  return (
    <div className="w-72 border-l border-border bg-card p-4 space-y-4 overflow-y-auto h-full fixed right-0 top-14 z-20 lg:relative lg:top-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-semibold">{t('search.filters')}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full">
        {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        {collapsed ? 'Show filters' : 'Hide filters'}
      </button>

      {!collapsed && (
        <div className="space-y-4">
          {page === 'properties' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('properties.type')}</label>
                <div className="flex flex-wrap gap-1">
                  {['villa', 'yacht', 'chalet', 'apartment'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const current = filters.propertyType ?? []
                        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
                        updateFilter('propertyType', updated.length > 0 ? updated : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${(filters.propertyType ?? []).includes(type) ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.location')}</label>
                <Input
                  value={filters.propertyLocation ?? ''}
                  onChange={e => updateFilter('propertyLocation', e.target.value || undefined)}
                  placeholder="e.g. Saint-Tropez"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('properties.bedrooms')}</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.propertyBedrooms ?? ''}
                  onChange={e => updateFilter('propertyBedrooms', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Min bedrooms"
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {page === 'reservations' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.status')}</label>
                <div className="flex flex-wrap gap-1">
                  {['confirmed', 'pending', 'cancelled', 'completed', 'in_progress'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const current = filters.reservationStatus ?? []
                        const updated = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
                        updateFilter('reservationStatus', updated.length > 0 ? updated : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${(filters.reservationStatus ?? []).includes(s) ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('reservations.arrival')}</label>
                <Input
                  type="date"
                  value={filters.reservationDateFrom ?? ''}
                  onChange={e => updateFilter('reservationDateFrom', e.target.value || undefined)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('reservations.departure')}</label>
                <Input
                  type="date"
                  value={filters.reservationDateTo ?? ''}
                  onChange={e => updateFilter('reservationDateTo', e.target.value || undefined)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {page === 'payments' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.status')}</label>
                <div className="flex flex-wrap gap-1">
                  {['paid', 'pending', 'failed', 'refunded'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const current = filters.paymentStatus ?? []
                        const updated = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
                        updateFilter('paymentStatus', updated.length > 0 ? updated : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${(filters.paymentStatus ?? []).includes(s) ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('payments.minAmount')}</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.paymentMinAmount ?? ''}
                  onChange={e => updateFilter('paymentMinAmount', e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('payments.maxAmount')}</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.paymentMaxAmount ?? ''}
                  onChange={e => updateFilter('paymentMaxAmount', e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('payments.dateRange')}</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.paymentDateFrom ?? ''}
                    onChange={e => updateFilter('paymentDateFrom', e.target.value || undefined)}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.paymentDateTo ?? ''}
                    onChange={e => updateFilter('paymentDateTo', e.target.value || undefined)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {page === 'tasks' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.status')}</label>
                <div className="flex flex-wrap gap-1">
                  {['todo', 'in_progress', 'waiting', 'done'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const current = filters.taskStatus ?? []
                        const updated = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
                        updateFilter('taskStatus', updated.length > 0 ? updated : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${(filters.taskStatus ?? []).includes(s) ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.priority')}</label>
                <div className="flex flex-wrap gap-1">
                  {['low', 'medium', 'high'].map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        const current = filters.taskPriority ?? []
                        const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
                        updateFilter('taskPriority', updated.length > 0 ? updated : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${(filters.taskPriority ?? []).includes(p) ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={clearFilters} className="text-xs">
              {t('search.clearFilters')}
            </Button>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('search.saveFilter')}</p>
            <div className="flex gap-2">
              <Input
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="Filter name"
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" onClick={handleSave} disabled={!filterName.trim()}>
                <Bookmark className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {pageFilters.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('search.savedFilters')}</p>
              {pageFilters.map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <button
                    onClick={() => loadSavedFilter(f)}
                    className="text-xs hover:text-foreground text-muted-foreground"
                  >
                    {f.name}
                  </button>
                  <button onClick={() => removeSavedFilter(f.id)} className="p-0.5 hover:bg-muted rounded">
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
