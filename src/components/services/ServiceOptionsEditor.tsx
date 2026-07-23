import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  SERVICE_OPTION_PRESETS,
  createEmptyOptionGroup,
  type ServiceOptionGroup,
} from '@/lib/propertyServices'

interface ServiceOptionsEditorProps {
  value: ServiceOptionGroup[]
  onChange: (next: ServiceOptionGroup[]) => void
  disabled?: boolean
}

export function ServiceOptionsEditor({
  value,
  onChange,
  disabled = false,
}: ServiceOptionsEditorProps) {
  const patchGroup = (index: number, partial: Partial<ServiceOptionGroup>) => {
    onChange(value.map((group, i) => (i === index ? { ...group, ...partial } : group)))
  }

  const patchChoice = (
    groupIndex: number,
    choiceIndex: number,
    partial: Partial<ServiceOptionGroup['choices'][number]>,
  ) => {
    onChange(value.map((group, i) => {
      if (i !== groupIndex) return group
      return {
        ...group,
        choices: group.choices.map((choice, j) => (
          j === choiceIndex ? { ...choice, ...partial } : choice
        )),
      }
    }))
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Options du service</p>
        <p className="text-xs text-muted-foreground">
          Ex. aéroport + prix pour un transfert, modèle pour une location de voiture.
          Les prix s’ajoutent au prix de base.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SERVICE_OPTION_PRESETS.map(preset => (
          <Button
            key={preset.id}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => {
              if (value.some(g => g.id === preset.group.id)) return
              onChange([...value, structuredClone(preset.group)])
            }}
          >
            + {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...value, createEmptyOptionGroup()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Groupe libre
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune option. Le voyageur voit uniquement le prix de base.
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((group, groupIndex) => (
            <div key={`${group.id}-${groupIndex}`} className="space-y-2 rounded-md bg-muted/40 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <Input
                    label="Nom du groupe"
                    value={group.label}
                    disabled={disabled}
                    onChange={e => patchGroup(groupIndex, { label: e.target.value })}
                    placeholder="Aéroport"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Switch
                    checked={group.required}
                    disabled={disabled}
                    onCheckedChange={v => patchGroup(groupIndex, { required: v })}
                  />
                  <span className="text-xs text-muted-foreground">Obligatoire</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-destructive"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((_, i) => i !== groupIndex))}
                  aria-label="Supprimer le groupe"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {group.choices.map((choice, choiceIndex) => (
                  <div key={`${choice.id}-${choiceIndex}`} className="grid grid-cols-[1fr_100px_auto] gap-2">
                    <Input
                      label={choiceIndex === 0 ? 'Choix' : undefined}
                      value={choice.label}
                      disabled={disabled}
                      onChange={e => patchChoice(groupIndex, choiceIndex, { label: e.target.value })}
                      placeholder="Nice Côte d’Azur"
                    />
                    <Input
                      label={choiceIndex === 0 ? 'Prix (€)' : undefined}
                      type="number"
                      min={0}
                      step="1"
                      value={String(choice.price)}
                      disabled={disabled}
                      onChange={e => patchChoice(groupIndex, choiceIndex, {
                        price: Number(e.target.value) || 0,
                      })}
                    />
                    <div className={choiceIndex === 0 ? 'pt-6' : ''}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-destructive"
                        disabled={disabled || group.choices.length <= 1}
                        onClick={() => patchGroup(groupIndex, {
                          choices: group.choices.filter((_, i) => i !== choiceIndex),
                        })}
                        aria-label="Supprimer le choix"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => patchGroup(groupIndex, {
                  choices: [
                    ...group.choices,
                    {
                      id: `choice-${group.choices.length + 1}`,
                      label: `Option ${group.choices.length + 1}`,
                      price: 0,
                    },
                  ],
                })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Ajouter un choix
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
