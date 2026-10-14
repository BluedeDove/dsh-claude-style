import {describe, expect, it} from 'vitest'
import {statusTransitions} from './status'

describe('live reminders', () => {
  it('does not replay unread history or late catalog entries', () => {
    const baseline = statusTransitions(new Map([['old', {completionUnread: true}]]), undefined)
    expect(baseline.reminders).toEqual([])
    expect(statusTransitions(new Map([['old', {completionUnread: true}], ['late', {completionUnread: true}]]), baseline.next).reminders).toEqual([])
  })
  it('reports a completion once and reports a new input request by its key', () => {
    const baseline = statusTransitions(new Map([['a', {running: true}]]), undefined)
    const complete = statusTransitions(new Map([['a', {running: false, completionUnread: true}]]), baseline.next)
    expect(complete.reminders).toEqual([{id: 'a', kind: 'complete', key: 'complete'}])
    expect(statusTransitions(new Map([['a', {running: false, completionUnread: true}]]), complete.next).reminders).toEqual([])
    const pending = statusTransitions(new Map([['a', {running: true, pendingInteraction: {key: 'approval-1'}}]]), complete.next)
    expect(pending.reminders).toEqual([{id: 'a', kind: 'pending', key: 'approval-1'}])
    expect(statusTransitions(new Map([['a', {running: true, pendingInteraction: {key: 'approval-1'}}]]), pending.next).reminders).toEqual([])
  })
  it('treats a waiting task as pending and removes deleted status entries', () => {
    const baseline = statusTransitions(new Map([['a', {running: true}]]), undefined)
    expect(statusTransitions(new Map([['a', {running: false, pendingInteraction: 'question'}]]), baseline.next).reminders.map(item => item.kind)).toEqual(['pending'])
    expect(statusTransitions(new Map(), baseline.next).next.size).toBe(0)
  })
})
