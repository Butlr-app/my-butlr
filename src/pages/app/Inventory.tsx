import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useInventoryItems, useInventoryMovements, useProperties, type InventoryItem, type InventoryMovement } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Package, Loader2, Plus, Trash2, Minus, ShoppingCart, History } from 'lucide-react'

const categories: InventoryItem['category'][] = ['welcome_products', 'linen', 'cleaning', 'maintenance', 'food_beverage', 'other']
const reasons: InventoryMovement['reason'][] = ['restock', 'usage', 'loss', 'adjustment']

interface ItemForm {
  property_id: string
  name: string
  category: InventoryItem['category']
  unit: string
  quantity: string
  threshold: string
}

const emptyForm: ItemForm = { property_id: '', name: '', category: 'welcome_products', unit: 'unit', quantity: '0', threshold: '0' }

function isLow(item: InventoryItem): boolean {
  return item.threshold > 0 && item.quantity <= item.threshold
}

export function Inventory() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawItems, loading, insert, remove, refetch } = useInventoryItems()
  const { data: movements, insert: insertMovement, refetch: refetchMovements } = useInventoryMovements()
  const { data: rawProperties } = useProperties()
  const { filterInventoryItems, filterProperties } = useRoleFilter()

  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null)
  const [movementDelta, setMovementDelta] = useState('1')
  const [movementReason, setMovementReason] = useState<InventoryMovement['reason']>('restock')
  const [movementNote, setMovementNote] = useState('')
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)

  const properties = filterProperties(rawProperties)
  const visibleItems = filterInventoryItems(rawItems)
  const items = visibleItems
    .filter(i => !propertyFilter || i.property_id === propertyFilter)
    .filter(i => !categoryFilter || i.category === categoryFilter)
    .filter(i => !lowOnly || isLow(i))
    .sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name))
  const shoppingList = visibleItems.filter(isLow)
  const canDelete = actualRole === 'owner' || actualRole === 'agency'

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'

  const openCreate = () => {
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.property_id) {
      setFormError(t('inventory.formError'))
      return
    }
    setSaving(true)
    try {
      await insert({
        property_id: form.property_id,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit.trim() || 'unit',
        quantity: Math.max(0, parseInt(form.quantity, 10) || 0),
        threshold: Math.max(0, parseInt(form.threshold, 10) || 0),
        created_by: user?.id ?? null,
      })
      toast(t('inventory.created'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const openMovement = (item: InventoryItem, direction: 1 | -1) => {
    setMovementItem(item)
    setMovementDelta(String(direction))
    setMovementReason(direction === 1 ? 'restock' : 'usage')
    setMovementNote('')
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementItem) return
    const delta = parseInt(movementDelta, 10)
    if (!delta) {
      toast(t('inventory.deltaError'), 'error')
      return
    }
    setSaving(true)
    try {
      await insertMovement({
        item_id: movementItem.id,
        delta,
        reason: movementReason,
        note: movementNote.trim() || null,
        created_by: user?.id ?? null,
      })
      await refetch()
      toast(t('inventory.movementSaved'))
      setMovementItem(null)
    } catch (err) {
      toast((err as Error).message, 'error')
      await refetchMovements()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('inventory.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6" data-testid="inventory">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('inventory.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('inventory.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('inventory.addItem')}
          </Button>
        </div>
      </div>

      {shoppingList.length > 0 && (
        <Card className="p-4 border-warning/40" data-testid="shopping-list">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-warning" />
            <p className="text-sm font-semibold">{t('inventory.shoppingList')}</p>
            <Badge variant="warning">{shoppingList.length}</Badge>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            {shoppingList.map(item => (
              <li key={item.id}>
                {item.name} — {propertyName(item.property_id)} · {t('inventory.toBuy')
                  .replace('{count}', String(Math.max(item.threshold - item.quantity, 0) + 1))
                  .replace('{unit}', item.unit)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('inventory.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          className="w-48"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: t('inventory.allCategories') },
            ...categories.map(c => ({ value: c, label: t(`inventory.category.${c}`) })),
          ]}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          {t('inventory.lowOnly')}
        </label>
      </div>

      {items.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('inventory.empty')}</Card>
      )}

      <div className="grid gap-3">
        {items.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <Badge variant="muted">{t(`inventory.category.${item.category}`)}</Badge>
                  {isLow(item) && <Badge variant="warning">{t('inventory.lowStock')}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {propertyName(item.property_id)} · {t('inventory.thresholdLabel')}: {item.threshold} {item.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums" data-testid={`qty-${item.id}`}>
                  {item.quantity} {item.unit}
                </span>
                <Button size="sm" variant="secondary" title={t('inventory.stockOut')} onClick={() => openMovement(item, -1)}>
                  <Minus className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" title={t('inventory.stockIn')} onClick={() => openMovement(item, 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" title={t('inventory.history')} onClick={() => setHistoryItem(item)}>
                  <History className="w-4 h-4" />
                </Button>
                {canDelete && (
                  <Button size="sm" variant="secondary" title={t('common.delete')} onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('inventory.addItem')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('inventory.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('inventory.itemName')}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={t('inventory.namePlaceholder')}
            error={formError || undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('inventory.categoryLabel')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as InventoryItem['category'] }))}
              options={categories.map(c => ({ value: c, label: t(`inventory.category.${c}`) }))}
            />
            <Input
              label={t('inventory.unitLabel')}
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('inventory.quantityLabel')}
              type="number"
              min="0"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
            <Input
              label={t('inventory.thresholdLabel')}
              type="number"
              min="0"
              value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('inventory.addItem')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!movementItem}
        onClose={() => setMovementItem(null)}
        title={movementItem ? `${t('inventory.movement')} — ${movementItem.name}` : ''}
      >
        {movementItem && (
          <form onSubmit={handleMovement} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('inventory.currentStock')}: {movementItem.quantity} {movementItem.unit}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('inventory.deltaLabel')}
                type="number"
                value={movementDelta}
                onChange={e => setMovementDelta(e.target.value)}
              />
              <Select
                label={t('inventory.reasonLabel')}
                value={movementReason}
                onChange={e => setMovementReason(e.target.value as InventoryMovement['reason'])}
                options={reasons.map(r => ({ value: r, label: t(`inventory.reason.${r}`) }))}
              />
            </div>
            <Input
              label={t('inventory.noteLabel')}
              value={movementNote}
              onChange={e => setMovementNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setMovementItem(null)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t('inventory.saveMovement')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!historyItem}
        onClose={() => setHistoryItem(null)}
        title={historyItem ? `${t('inventory.history')} — ${historyItem.name}` : ''}
      >
        {historyItem && (
          <div className="space-y-2">
            {movements.filter(m => m.item_id === historyItem.id).length === 0 && (
              <p className="text-sm text-muted-foreground">{t('inventory.noMovements')}</p>
            )}
            {movements.filter(m => m.item_id === historyItem.id).map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <span className={m.delta > 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="ml-2">{t(`inventory.reason.${m.reason}`)}</span>
                  {m.note && <span className="text-muted-foreground"> · {m.note}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('inventory.deleteTitle')}
        message={deleteTarget ? t('inventory.deleteMessage').replace('{name}', deleteTarget.name) : ''}
      />
    </div>
  )
}
