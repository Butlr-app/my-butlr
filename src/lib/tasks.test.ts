import { describe, expect, it } from 'vitest'
import {
  buildTaskPayload,
  groupTasksForTodo,
  sortTasksForDisplay,
  taskDueOnDate,
  taskTodoSection,
  validateTaskInput,
  type TaskRecord,
} from './tasks'

const baseTask = (overrides: Partial<TaskRecord>): TaskRecord => ({
  id: 'task-1',
  property_id: 'prop-1',
  reservation_id: null,
  partner_id: null,
  link_type: 'property',
  title: 'Test',
  description: null,
  status: 'todo',
  priority: 'medium',
  due_date: null,
  ...overrides,
})

describe('tasks', () => {
  it('valide le rattachement obligatoire selon le type', () => {
    expect(validateTaskInput({
      linkType: 'property',
      title: 'Préparer la villa',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      propertyId: '',
      reservationId: '',
      partnerId: '',
    })).toBe('Sélectionnez une villa.')

    expect(validateTaskInput({
      linkType: 'client',
      title: 'Accueil client',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      propertyId: '',
      reservationId: '',
      partnerId: '',
    })).toBe('Sélectionnez un séjour client.')

    expect(validateTaskInput({
      linkType: 'partner',
      title: 'Commander fleurs',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      propertyId: '',
      reservationId: '',
      partnerId: '',
    })).toBe('Sélectionnez un prestataire.')

    expect(validateTaskInput({
      linkType: 'partner',
      title: 'Entretenir la piscine',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      propertyId: '',
      reservationId: '',
      partnerId: 'partner-1',
    })).toBe('Sélectionnez la villa concernée.')
  })

  it('construit le payload selon le type de lien', () => {
    expect(buildTaskPayload({
      linkType: 'property',
      title: ' Ménage ',
      description: '  ',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-08-01',
      propertyId: 'prop-1',
      reservationId: '',
      partnerId: '',
    })).toMatchObject({
      link_type: 'property',
      title: 'Ménage',
      description: null,
      property_id: 'prop-1',
      reservation_id: null,
      partner_id: null,
    })

    expect(buildTaskPayload({
      linkType: 'client',
      title: 'Check-in',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '',
      propertyId: 'prop-1',
      reservationId: 'res-1',
      partnerId: '',
    })).toMatchObject({
      reservation_id: 'res-1',
      property_id: null,
      partner_id: null,
    })

    expect(buildTaskPayload({
      linkType: 'partner',
      title: 'Passage jardinier',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-08-04',
      propertyId: 'prop-1',
      reservationId: '',
      partnerId: 'partner-1',
    })).toMatchObject({
      link_type: 'partner',
      property_id: 'prop-1',
      reservation_id: null,
      partner_id: 'partner-1',
    })
  })

  it('classe les tâches par section to-do', () => {
    expect(taskTodoSection(baseTask({ due_date: '2026-07-10' }), '2026-07-15')).toBe('overdue')
    expect(taskTodoSection(baseTask({ due_date: '2026-07-15' }), '2026-07-15')).toBe('today')
    expect(taskTodoSection(baseTask({ due_date: '2026-07-18' }), '2026-07-15')).toBe('week')
    expect(taskTodoSection(baseTask({ due_date: '2026-08-01' }), '2026-07-15')).toBe('later')
    expect(taskTodoSection(baseTask({ due_date: null }), '2026-07-15')).toBe('no_date')
    expect(taskTodoSection(baseTask({ status: 'done', due_date: '2026-07-15' }), '2026-07-15')).toBe('done')
  })

  it('groupe et trie les tâches pour la vue to-do', () => {
    const groups = groupTasksForTodo([
      baseTask({ id: 'a', due_date: '2026-07-15', priority: 'low', title: 'A' }),
      baseTask({ id: 'b', due_date: '2026-07-15', priority: 'high', title: 'B' }),
      baseTask({ id: 'c', due_date: '2026-07-10', priority: 'medium', title: 'C' }),
    ], '2026-07-15')

    expect(groups.overdue.map(task => task.id)).toEqual(['c'])
    expect(groups.today.map(task => task.id)).toEqual(['b', 'a'])
    expect(taskDueOnDate(baseTask({ due_date: '2026-07-15' }), '2026-07-15')).toBe(true)
    expect(sortTasksForDisplay(
      baseTask({ priority: 'low' }),
      baseTask({ priority: 'high' }),
    )).toBeGreaterThan(0)
  })
})
