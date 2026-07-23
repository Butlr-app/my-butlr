import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal a11y', () => {
  it('exposes dialog semantics and closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal open title="Détail" onClose={onClose}>
        <button type="button">Action</button>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Détail' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('only closes the top dialog when modals are nested', async () => {
    const user = userEvent.setup()
    const closeParent = vi.fn()
    const closeChild = vi.fn()

    render(
      <Modal open title="Prestataire" onClose={closeParent}>
        <Modal open title="Nouvelle tâche" onClose={closeChild}>
          <button type="button">Créer</button>
        </Modal>
      </Modal>,
    )

    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(closeChild).toHaveBeenCalledOnce()
    expect(closeParent).not.toHaveBeenCalled()
  })
})
