import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useBudgets, useExpenses, useProperties, type Budget } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Wallet, Loader2, Check } from 'lucide-react'

const euro = (n: number) => '€' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const currentMonth = () => new Date().toISOString().slice(0, 7)

export function Budgets() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawBudgets, loading, insert, update } = useBudgets()
  const { data: rawExpenses } = useExpenses()
  const { data: rawProperties } = useProperties()
  const { filterProperties, filterBudgets } = useRoleFilter()

  const canManage = actualRole === 'owner' || actualRole === 'agency'
  const [month, setMonth] = useState(currentMonth())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const periodMonth = `${month}-01`
  const properties = filterProperties(rawProperties)
  const budgets = filterBudgets(rawBudgets)

  const spentByProperty = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of rawExpenses) {
      if (e.status !== 'approved') continue
      if (e.expense_date?.slice(0, 7) !== month) continue
      map[e.property_id] = (map[e.property_id] ?? 0) + Number(e.amount)
    }
    return map
  }, [rawExpenses, month])

  const budgetFor = (propertyId: string): Budget | undefined =>
    budgets.find(b => b.property_id === propertyId && b.period_month === periodMonth)

  const saveBudget = async (propertyId: string) => {
    const raw = drafts[propertyId]
    if (raw === undefined) return
    const amount = Number(raw)
    if (Number.isNaN(amount) || amount < 0) {
      toast(t('budgets.invalidAmount'), 'error')
      return
    }
    setSavingId(propertyId)
    try {
      const existing = budgetFor(propertyId)
      if (existing) {
        await update(existing.id, { amount })
      } else {
        await insert({ property_id: propertyId, period_month: periodMonth, amount, created_by: user?.id ?? null })
      }
      toast(t('budgets.saved'))
      setDrafts(d => { const n = { ...d }; delete n[propertyId]; return n })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSavingId(null)
  }

  const totals = properties.reduce(
    (acc, p) => {
      acc.budget += budgetFor(p.id)?.amount ?? 0
      acc.spent += spentByProperty[p.id] ?? 0
      return acc
    },
    { budget: 0, spent: 0 },
  )

  return (
    <div className="space-y-6" data-testid="budgets">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('budgets.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('budgets.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-9 px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('budgets.totalBudget')}</p>
          <p className="text-lg font-bold mt-1">{euro(totals.budget)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('budgets.totalSpent')}</p>
          <p className="text-lg font-bold mt-1">{euro(totals.spent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('budgets.totalRemaining')}</p>
          <p className={`text-lg font-bold mt-1 ${totals.spent > totals.budget && totals.budget > 0 ? 'text-destructive' : ''}`}>
            {euro(totals.budget - totals.spent)}
          </p>
        </Card>
      </div>

      {properties.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('budgets.empty')}</Card>
      )}

      <div className="grid gap-3">
        {properties.map(property => {
          const budget = budgetFor(property.id)
          const budgetAmount = budget?.amount ?? 0
          const spent = spentByProperty[property.id] ?? 0
          const pct = budgetAmount > 0 ? Math.min(100, Math.round((spent / budgetAmount) * 100)) : 0
          const over = budgetAmount > 0 && spent > budgetAmount
          const draft = drafts[property.id]
          return (
            <Card key={property.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{property.name}</p>
                    {over && <Badge variant="destructive">{t('budgets.overBudget')}</Badge>}
                    {budgetAmount === 0 && <Badge variant="muted">{t('budgets.noBudget')}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('budgets.spent')} {euro(spent)}
                    {budgetAmount > 0 && <> {t('budgets.of')} {euro(budgetAmount)} · {pct}%</>}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <input
                      type="number"
                      min="0"
                      value={draft !== undefined ? draft : String(budgetAmount || '')}
                      placeholder="0"
                      onChange={e => setDrafts(d => ({ ...d, [property.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveBudget(property.id) }}
                      className="h-9 w-28 px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                    />
                    <button
                      onClick={() => saveBudget(property.id)}
                      disabled={draft === undefined || savingId === property.id}
                      className="h-9 px-3 inline-flex items-center gap-1.5 rounded-sm bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                    >
                      {savingId === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {t('common.save')}
                    </button>
                  </div>
                )}
              </div>
              {budgetAmount > 0 && (
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
