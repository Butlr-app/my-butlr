import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import {
  fetchCatalogItems,
  formatCatalogPrice,
  type CatalogItem,
} from '@/lib/boutique'

export function BoutiqueCatalogPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<(CatalogItem & { catalog_categories?: { name: string; slug: string } })[]>([])

  useEffect(() => {
    fetchCatalogItems(true).then(({ data }) => {
      setItems((data ?? []) as typeof items)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState label="Chargement du catalogue…" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} article{items.length > 1 ? 's' : ''} dans le catalogue global.
        </p>
        <Link
          to="/app/boutique/products/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un produit
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Catalogue vide"
          description="Ajoutez votre premier produit ou service pour l'afficher dans la Boutique du portail voyageur."
          action={
            <Link
              to="/app/boutique/products/new"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Ajouter un produit
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className="flex flex-col overflow-hidden p-0">
              {item.images?.[0] ? (
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={item.images[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-muted text-xs text-muted-foreground">
                  Aucune photo
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {item.catalog_categories?.name ?? item.category_id}
                </p>
                <div className="flex gap-1">
                  {!item.is_active && <Badge variant="muted">Inactif</Badge>}
                  {item.is_featured && <Badge variant="muted">Vedette</Badge>}
                </div>
              </div>
              <p className="mt-1 font-medium">{item.title}</p>
              <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {item.short_description}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatCatalogPrice(item, null)}
              </p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{item.type}</p>
              <Link
                to={`/app/boutique/products/${item.id}/edit`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
