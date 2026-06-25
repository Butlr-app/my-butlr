import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useProperties, useReservations, useTasks, usePropertyAmenities, usePropertyRooms, usePropertyImages, type PropertyRoom } from '@/lib/useSupabase'
import { ImageUpload, ImageGallery } from '@/components/ui/ImageUpload'
import { useToast } from '@/components/ui/Toast'
import { AMENITY_CATEGORIES, ROOM_TYPES, BEDDING_TYPES } from '@/data/amenities'
import {
  ArrowLeft, Loader2, ChevronDown, ChevronRight, Check, Star, Bath, Tv, Thermometer,
  Shield, Wifi, UtensilsCrossed, MapPin, Car, Waves, TreePine, BedDouble, Plus, Trash2, Save
} from 'lucide-react'
import { useState, useMemo } from 'react'

const tabs = ['Overview', 'Photos', 'Amenities', 'Rooms', 'Bookings', 'Tasks', 'Services', 'Documents']

const statusMap: Record<string, { variant: 'success' | 'muted' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'muted', label: 'Inactive' },
  maintenance: { variant: 'warning', label: 'Maintenance' },
}

const categoryIcons: Record<string, React.ReactNode> = {
  essentials: <Star className="w-4 h-4" />,
  bathroom_laundry: <Bath className="w-4 h-4" />,
  entertainment: <Tv className="w-4 h-4" />,
  heating_cooling: <Thermometer className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  internet_office: <Wifi className="w-4 h-4" />,
  kitchen_dining: <UtensilsCrossed className="w-4 h-4" />,
  location_features: <MapPin className="w-4 h-4" />,
  parking_facilities: <Car className="w-4 h-4" />,
  pool_spa: <Waves className="w-4 h-4" />,
  outdoor_activities: <TreePine className="w-4 h-4" />,
  services: <BedDouble className="w-4 h-4" />,
}

export function PropertyDetail() {
  const { id } = useParams()
  const { data: properties, loading } = useProperties()
  const { data: reservations } = useReservations()
  const { data: tasks } = useTasks()
  const { amenityKeys, loading: amenitiesLoading, saveAmenities } = usePropertyAmenities(id)
  const { rooms, loading: roomsLoading, addRoom, updateRoom, removeRoom } = usePropertyRooms(id)
  const { images, loading: imagesLoading, addImage, removeImage } = usePropertyImages(id)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('Overview')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['essentials']))
  const [editingAmenities, setEditingAmenities] = useState(false)
  const [draftAmenityKeys, setDraftAmenityKeys] = useState<Set<string>>(new Set())
  const [savingAmenities, setSavingAmenities] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<PropertyRoom | null>(null)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<PropertyRoom | null>(null)
  const [roomForm, setRoomForm] = useState({
    room_type: 'bedroom',
    room_name: '',
    variant: 'private' as 'private' | 'shared',
    bedding: [] as Array<{ type: string; count: number }>,
  })
  const [savingRoom, setSavingRoom] = useState(false)

  const property = properties.find(p => p.id === id)
  const propReservations = reservations.filter(r => r.property_id === id)
  const propTasks = tasks.filter(t => t.property_id === id)

  const amenityKeySet = useMemo(() => new Set(amenityKeys), [amenityKeys])

  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of AMENITY_CATEGORIES) {
      const activeSet = editingAmenities ? draftAmenityKeys : amenityKeySet
      counts[cat.key] = cat.items.filter(i => activeSet.has(i.key)).length
    }
    return counts
  }, [amenityKeySet, draftAmenityKeys, editingAmenities])

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const startEditAmenities = () => {
    setDraftAmenityKeys(new Set(amenityKeys))
    setEditingAmenities(true)
  }

  const toggleAmenity = (key: string) => {
    setDraftAmenityKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const handleSaveAmenities = async () => {
    setSavingAmenities(true)
    try {
      await saveAmenities([...draftAmenityKeys])
      setEditingAmenities(false)
      toast('Amenities updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSavingAmenities(false)
  }

  const openAddRoom = () => {
    setEditingRoom(null)
    setRoomForm({ room_type: 'bedroom', room_name: '', variant: 'private', bedding: [] })
    setShowRoomModal(true)
  }

  const openEditRoom = (room: PropertyRoom) => {
    setEditingRoom(room)
    setRoomForm({
      room_type: room.room_type,
      room_name: room.room_name ?? '',
      variant: room.variant,
      bedding: room.bedding ?? [],
    })
    setShowRoomModal(true)
  }

  const addBeddingRow = () => {
    setRoomForm(f => ({ ...f, bedding: [...f.bedding, { type: 'king', count: 1 }] }))
  }

  const updateBeddingRow = (index: number, field: 'type' | 'count', value: string | number) => {
    setRoomForm(f => ({
      ...f,
      bedding: f.bedding.map((b, i) => i === index ? { ...b, [field]: value } : b),
    }))
  }

  const removeBeddingRow = (index: number) => {
    setRoomForm(f => ({ ...f, bedding: f.bedding.filter((_, i) => i !== index) }))
  }

  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSavingRoom(true)
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, {
          room_type: roomForm.room_type,
          room_name: roomForm.room_name || null,
          variant: roomForm.variant,
          bedding: roomForm.bedding,
        })
        toast('Room updated')
      } else {
        await addRoom({
          property_id: id,
          room_type: roomForm.room_type,
          room_name: roomForm.room_name || null,
          variant: roomForm.variant,
          bedding: roomForm.bedding,
        })
        toast('Room added')
      }
      setShowRoomModal(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSavingRoom(false)
  }

  const confirmDeleteRoom = async () => {
    if (!deleteRoomTarget) return
    try {
      await removeRoom(deleteRoomTarget.id)
      toast('Room deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteRoomTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Properties
        </Link>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Property not found.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Properties
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{property.name}</h2>
          <p className="text-sm text-muted-foreground">{property.location || 'No location'}</p>
        </div>
        <Badge variant={statusMap[property.status]?.variant ?? 'muted'}>
          {statusMap[property.status]?.label ?? property.status}
        </Badge>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'Amenities' && amenityKeys.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{amenityKeys.length}</span>
              )}
              {tab === 'Rooms' && rooms.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{rooms.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overview Tab ───────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Bedrooms</p>
            <p className="text-2xl font-mono font-medium">{property.bedrooms}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Bathrooms</p>
            <p className="text-2xl font-mono font-medium">{property.bathrooms}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Max Guests</p>
            <p className="text-2xl font-mono font-medium">{property.max_guests}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Type</p>
            <p className="text-lg font-medium capitalize">{property.type}</p>
          </Card>
          {property.surface_m2 > 0 && (
            <Card className="p-5">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Surface</p>
              <p className="text-2xl font-mono font-medium">{property.surface_m2} <span className="text-sm">m²</span></p>
            </Card>
          )}
          {property.units > 1 && (
            <Card className="p-5">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Units</p>
              <p className="text-2xl font-mono font-medium">{property.units}</p>
            </Card>
          )}
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Reservations</p>
            <p className="text-2xl font-mono font-medium">{propReservations.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Open Tasks</p>
            <p className="text-2xl font-mono font-medium">{propTasks.filter(t => t.status !== 'done').length}</p>
          </Card>
          {amenityKeys.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Amenities</p>
              <p className="text-2xl font-mono font-medium">{amenityKeys.length}</p>
            </Card>
          )}
          {property.description && (
            <Card className="p-5 md:col-span-3">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </Card>
          )}
        </div>
      )}

      {/* ─── Photos Tab ──────────────────────────────────────────── */}
      {activeTab === 'Photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">
              Photo Gallery {images.length > 0 && `(${images.length})`}
            </p>
          </div>
          <ImageUpload
            storagePath={`properties/${id}`}
            onUploaded={async (url, storagePath) => {
              try {
                await addImage({ property_id: id!, url, storage_path: storagePath, caption: null, sort_order: images.length })
                toast('Photo uploaded')
              } catch (err) {
                toast((err as Error).message, 'error')
              }
            }}
          />
          <ImageGallery
            images={images}
            loading={imagesLoading}
            onRemove={async (imgId) => {
              try {
                await removeImage(imgId)
                toast('Photo removed')
              } catch (err) {
                toast((err as Error).message, 'error')
              }
            }}
          />
        </div>
      )}

      {/* ─── Amenities Tab ──────────────────────────────────────────── */}
      {activeTab === 'Amenities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">
              Equipment & Amenities {!editingAmenities && amenityKeys.length > 0 && `(${amenityKeys.length} selected)`}
            </p>
            {editingAmenities ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingAmenities(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveAmenities} disabled={savingAmenities}>
                  {savingAmenities ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={startEditAmenities}>Edit amenities</Button>
            )}
          </div>

          {amenitiesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {AMENITY_CATEGORIES.map(category => {
                const isExpanded = expandedCategories.has(category.key)
                const count = selectedCountByCategory[category.key]
                const activeSet = editingAmenities ? draftAmenityKeys : amenityKeySet

                return (
                  <Card key={category.key} className="overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{categoryIcons[category.key]}</span>
                        <span className="text-sm font-medium">{category.labelFr}</span>
                        {count > 0 && (
                          <span className="text-xs bg-foreground text-background px-2 py-0.5 rounded-full font-mono">
                            {count}
                          </span>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {category.items.map(item => {
                            const isSelected = activeSet.has(item.key)
                            return editingAmenities ? (
                              <label
                                key={item.key}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-foreground bg-foreground/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground/40'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-background" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={isSelected}
                                  onChange={() => toggleAmenity(item.key)}
                                />
                                <span className="text-sm">{item.labelFr}</span>
                              </label>
                            ) : (
                              <div
                                key={item.key}
                                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                                  isSelected ? 'text-foreground' : 'text-muted-foreground/40'
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 shrink-0" />
                                )}
                                <span className={`text-sm ${isSelected ? '' : 'line-through'}`}>{item.labelFr}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Rooms Tab ──────────────────────────────────────────────── */}
      {activeTab === 'Rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">
              Rooms & Bedding {rooms.length > 0 && `(${rooms.length})`}
            </p>
            <Button size="sm" onClick={openAddRoom}>
              <Plus className="w-4 h-4 mr-1" /> Add room
            </Button>
          </div>

          {roomsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No rooms configured yet.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={openAddRoom}>Add first room</Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => {
                const roomDef = ROOM_TYPES.find(r => r.key === room.room_type)
                return (
                  <Card key={room.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {room.room_name || roomDef?.labelFr || room.room_type}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {roomDef?.labelFr || room.room_type} · {room.variant === 'private' ? 'Privé' : 'Partagé'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditRoom(room)}
                          className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <BedDouble className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteRoomTarget(room)}
                          className="p-1.5 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {room.bedding && room.bedding.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Bedding</p>
                        {room.bedding.map((b, i) => {
                          const bedDef = BEDDING_TYPES.find(bt => bt.key === b.type)
                          return (
                            <p key={i} className="text-xs text-muted-foreground">
                              {b.count}x {bedDef?.labelFr || b.type}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Bookings Tab ───────────────────────────────────────────── */}
      {activeTab === 'Bookings' && (
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-4">Reservations for {property.name}</p>
          {propReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No reservations for this property.</p>
          ) : (
            <div className="space-y-3">
              {propReservations.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.arrival} → {r.departure}</p>
                  </div>
                  <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ─── Tasks Tab ──────────────────────────────────────────────── */}
      {activeTab === 'Tasks' && (
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-4">Tasks for {property.name}</p>
          {propTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks for this property.</p>
          ) : (
            <div className="space-y-3">
              {propTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'muted'}>
                    {t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {(activeTab === 'Services' || activeTab === 'Documents') && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{activeTab} for {property.name}</p>
          <Button variant="secondary" size="sm" className="mt-4">Configure {activeTab.toLowerCase()}</Button>
        </Card>
      )}

      {/* ─── Room Modal ─────────────────────────────────────────────── */}
      <Modal open={showRoomModal} onClose={() => setShowRoomModal(false)} title={editingRoom ? 'Edit Room' : 'Add Room'}>
        <form onSubmit={handleSubmitRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Room type"
              value={roomForm.room_type}
              onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))}
              options={ROOM_TYPES.map(r => ({ value: r.key, label: r.labelFr }))}
            />
            <Select
              label="Access"
              value={roomForm.variant}
              onChange={e => setRoomForm(f => ({ ...f, variant: e.target.value as 'private' | 'shared' }))}
              options={[
                { value: 'private', label: 'Privé' },
                { value: 'shared', label: 'Partagé' },
              ]}
            />
          </div>
          <Input
            label="Room name (optional)"
            value={roomForm.room_name}
            onChange={e => setRoomForm(f => ({ ...f, room_name: e.target.value }))}
            placeholder="e.g. Master Suite, Blue Room..."
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Bedding</p>
              <button type="button" onClick={addBeddingRow} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add bed
              </button>
            </div>
            {roomForm.bedding.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No bedding configured.</p>
            ) : (
              <div className="space-y-2">
                {roomForm.bedding.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={b.type}
                      onChange={e => updateBeddingRow(i, 'type', e.target.value)}
                      options={BEDDING_TYPES.map(bt => ({ value: bt.key, label: bt.labelFr }))}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={b.count}
                      onChange={e => updateBeddingRow(i, 'count', Number(e.target.value))}
                      className="w-20"
                    />
                    <button type="button" onClick={() => removeBeddingRow(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowRoomModal(false)}>Cancel</Button>
            <Button type="submit" disabled={savingRoom}>
              {savingRoom ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingRoom ? 'Save changes' : 'Add room'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteRoomTarget}
        onClose={() => setDeleteRoomTarget(null)}
        onConfirm={confirmDeleteRoom}
        title="Delete room"
        message={`Delete "${deleteRoomTarget?.room_name || deleteRoomTarget?.room_type}"? This action cannot be undone.`}
      />
    </div>
  )
}
