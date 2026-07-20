import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/* ── Online status ─────────────────────────────────────────────────────────── */

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}

/* ── Read cache (last successful fetch per table) ──────────────────────────── */

const CACHE_PREFIX = 'hm-cache:'

export function readCache<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, rows: T[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(rows))
  } catch {
    /* storage full or unavailable — cache is best-effort */
  }
}

/**
 * Returns live rows when the fetch succeeded, otherwise falls back to the
 * last cached copy. Successful fetches refresh the cache.
 */
export function useCachedRows<T>(
  key: string,
  rows: T[],
  loading: boolean,
  error: string | null,
): { rows: T[]; fromCache: boolean } {
  useEffect(() => {
    if (!loading && !error) writeCache(key, rows)
  }, [key, rows, loading, error])

  if (error) {
    const cached = readCache<T>(key)
    if (cached) return { rows: cached, fromCache: true }
  }
  return { rows, fromCache: false }
}

/* ── Offline mutation queue ────────────────────────────────────────────────── */

const QUEUE_KEY = 'hm-offline-queue'

export type QueuedOp =
  | { kind: 'task_update'; id: string; changes: Record<string, unknown> }
  | { kind: 'incident_insert'; tempId: string; row: Record<string, unknown> }
  | { kind: 'incident_update'; id: string; changes: Record<string, unknown> }

export function getQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedOp[]) : []
  } catch {
    return []
  }
}

function setQueue(ops: QueuedOp[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(ops))
  } catch {
    /* best-effort */
  }
}

export function queueOp(op: QueuedOp): void {
  setQueue([...getQueue(), op])
}

export function getPendingTaskStatus(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const op of getQueue()) {
    if (op.kind === 'task_update' && typeof op.changes.status === 'string') {
      map[op.id] = op.changes.status
    }
  }
  return map
}

export function getPendingIncidents(): { tempId: string; row: Record<string, unknown> }[] {
  return getQueue().flatMap(op =>
    op.kind === 'incident_insert' ? [{ tempId: op.tempId, row: op.row }] : [],
  )
}

export function getPendingIncidentStatus(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const op of getQueue()) {
    if (op.kind === 'incident_update' && typeof op.changes.status === 'string') {
      map[op.id] = op.changes.status
    }
  }
  return map
}

export const SYNC_EVENT = 'hm-offline-synced'

/**
 * Replays queued mutations against Supabase. Ops that fail with a network
 * error stay queued; ops rejected by the server (RLS, validation) are dropped
 * so the queue cannot wedge. Returns the number of synced ops and dispatches
 * SYNC_EVENT when at least one op was applied.
 */
export async function flushQueue(): Promise<number> {
  const ops = getQueue()
  if (ops.length === 0) return 0

  const remaining: QueuedOp[] = []
  let synced = 0

  for (const op of ops) {
    try {
      if (op.kind === 'task_update') {
        const { error } = await supabase.from('tasks').update(op.changes).eq('id', op.id)
        if (error) throw new Error(error.message)
      } else if (op.kind === 'incident_update') {
        const { error } = await supabase.from('incidents').update(op.changes).eq('id', op.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('incidents').insert(op.row)
        if (error) throw new Error(error.message)
      }
      synced++
    } catch (err) {
      const msg = (err as Error).message ?? ''
      if (!navigator.onLine || /fetch|network/i.test(msg)) {
        // Network failure — still offline, keep the op for the next flush.
        remaining.push(op)
      }
      // Server-side rejection (RLS, validation): drop the op.
    }
  }

  setQueue(remaining)
  if (synced > 0) window.dispatchEvent(new Event(SYNC_EVENT))
  return synced
}
