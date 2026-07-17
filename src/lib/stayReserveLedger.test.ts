import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  staffConfirmReserveTopUp,
  staffRejectReserveTopUp,
} from './stayReserve'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    rpc,
    from: vi.fn(),
  },
}))

describe('stay reserve ledger staff RPCs', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('confirms a pending top-up via staff RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        reserve: { id: 'reserve-1', current_balance: 500 },
        transaction: { id: 'tx-1', status: 'completed' },
      },
      error: null,
    })

    const result = await staffConfirmReserveTopUp('tx-1')
    expect(rpc).toHaveBeenCalledWith('staff_confirm_reserve_top_up', {
      p_transaction_id: 'tx-1',
    })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      transaction: { status: 'completed' },
    })
  })

  it('rejects a pending top-up via staff RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        reserve: { id: 'reserve-1' },
        transaction: { id: 'tx-1', status: 'cancelled' },
      },
      error: null,
    })

    const result = await staffRejectReserveTopUp('tx-1')
    expect(rpc).toHaveBeenCalledWith('staff_reject_reserve_top_up', {
      p_transaction_id: 'tx-1',
    })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      transaction: { status: 'cancelled' },
    })
  })

  it('surfaces RPC error payloads', async () => {
    rpc.mockResolvedValue({ data: { error: 'forbidden' }, error: null })
    const result = await staffConfirmReserveTopUp('tx-bad')
    expect(result.error).toBeInstanceOf(Error)
  })
})
