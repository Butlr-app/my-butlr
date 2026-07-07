import { useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useExpenses, useProperties, type Expense } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Receipt, Loader2, Plus, Trash2, Paperclip, Check, X, Image } from 'lucide-react'

const categories: Expense['category'][] = ['cleaning', 'maintenance', 'supplies', 'utilities', 'staff', 'other']
const statuses: Expense['status'][] = ['pending', 'approved', 'rejected']

const statusVariant: Record<Expense['status'], 'warning' | 'success' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'muted',
}

interface ExpenseForm {
  property_id: string
  label: string
  category: Expense['category']
  vendor: string
  amount: string
  expense_date: string
  note: string
  receipt_data: string
}

const emptyForm: ExpenseForm = {
  property_id: '',
  label: '',
  category: 'supplies',
  vendor: '',
  amount: '',
  expense_date: new Date().toISOString().slice(0, 10),
  note: '',
  receipt_data: '',
}

export function Expenses() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawExpenses, loading, insert, update, remove } = useExpenses()
  const { data: rawProperties } = useProperties()
  const { filterExpenses, filterProperties } = useRoleFilter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [receiptExpense, setReceiptExpense] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const properties = filterProperties(rawProperties)
  const visibleExpenses = filterExpenses(rawExpenses)
  const expenses = visibleExpenses
    .filter(e => !propertyFilter || e.property_id === propertyFilter)
    .filter(e => !categoryFilter || e.category === categoryFilter)
    .filter(e => !statusFilter || e.status === statusFilter)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at))
  const total = expenses.filter(e => e.status !== 'rejected').reduce((sum, e) => sum + Number(e.amount), 0)
  const isOwner = actualRole === 'owner' || actualRole === 'agency'

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'

  const openCreate = () => {
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '', expense_date: new Date().toISOString().slice(0, 10) })
    setFormError('')
    setShowForm(true)
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, receipt_data: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.label.trim() || !form.property_id || !amount || amount <= 0) {
      setFormError(t('expenses.formError'))
      return
    }
    setSaving(true)
    try {
      await insert({
        property_id: form.property_id,
        label: form.label.trim(),
        category: form.category,
        vendor: form.vendor.trim() || null,
        amount,
        expense_date: form.expense_date,
        note: form.note.trim() || null,
        receipt_data: form.receipt_data || null,
        created_by: user?.id ?? null,
      })
      toast(t('expenses.created'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleReview = async (expense: Expense, status: 'approved' | 'rejected') => {
    try {
      await update(expense.id, { status })
      toast(t(`expenses.${status}`))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('expenses.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6" data-testid="expenses">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('expenses.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('expenses.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('expenses.addExpense')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('expenses.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          className="w-44"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: t('expenses.allCategories') },
            ...categories.map(c => ({ value: c, label: t(`expenses.category.${c}`) })),
          ]}
        />
        <Select
          className="w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: t('expenses.allStatuses') },
            ...statuses.map(s => ({ value: s, label: t(`expenses.status.${s}`) })),
          ]}
        />
        <span className="ml-auto text-sm font-semibold tabular-nums" data-testid="expenses-total">
          {t('expenses.total')}: €{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {expenses.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('expenses.empty')}</Card>
      )}

      <div className="grid gap-3">
        {expenses.map(expense => (
          <Card key={expense.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{expense.label}</p>
                  <Badge variant="muted">{t(`expenses.category.${expense.category}`)}</Badge>
                  <Badge variant={statusVariant[expense.status]}>{t(`expenses.status.${expense.status}`)}</Badge>
                  {expense.receipt_data && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={() => setReceiptExpense(expense)}
                    >
                      <Paperclip className="w-3 h-3" />
                      {t('expenses.receipt')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {propertyName(expense.property_id)} · {new Date(expense.expense_date).toLocaleDateString()}
                  {expense.vendor && <> · {expense.vendor}</>}
                  {expense.note && <> · {expense.note}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums" data-testid={`amount-${expense.id}`}>
                  €{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {isOwner && expense.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" title={t('expenses.approve')} onClick={() => handleReview(expense, 'approved')}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" title={t('expenses.reject')} onClick={() => handleReview(expense, 'rejected')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {isOwner && (
                  <Button size="sm" variant="secondary" title={t('common.delete')} onClick={() => setDeleteTarget(expense)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('expenses.addExpense')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('expenses.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('expenses.labelLabel')}
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder={t('expenses.labelPlaceholder')}
            error={formError || undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('expenses.categoryLabel')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as Expense['category'] }))}
              options={categories.map(c => ({ value: c, label: t(`expenses.category.${c}`) }))}
            />
            <Input
              label={t('expenses.vendorLabel')}
              value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('expenses.amountLabel')}
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
            <Input
              label={t('expenses.dateLabel')}
              type="date"
              value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
            />
          </div>
          <Input
            label={t('expenses.noteLabel')}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="w-4 h-4 mr-1.5" />
              {form.receipt_data ? t('expenses.receiptAttached') : t('expenses.attachReceipt')}
            </Button>
            {form.receipt_data && (
              <img src={form.receipt_data} alt={t('expenses.receipt')} className="mt-2 max-h-32 rounded-lg border border-border" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('expenses.addExpense')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!receiptExpense}
        onClose={() => setReceiptExpense(null)}
        title={receiptExpense ? `${t('expenses.receipt')} — ${receiptExpense.label}` : ''}
      >
        {receiptExpense?.receipt_data ? (
          <img src={receiptExpense.receipt_data} alt={t('expenses.receipt')} className="max-h-96 mx-auto rounded-lg border border-border" />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="w-4 h-4" />
            {t('expenses.noReceipt')}
          </p>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('expenses.deleteTitle')}
        message={deleteTarget ? t('expenses.deleteMessage').replace('{label}', deleteTarget.label) : ''}
      />
    </div>
  )
}
