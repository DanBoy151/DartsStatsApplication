import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, skipFor, takeForFetch, splitPage, pageAfterDelete } from '../page'

describe('skipFor', () => {
  it('is 0 for the first page', () => {
    expect(skipFor(0)).toBe(0)
  })

  it('advances by PAGE_SIZE per page', () => {
    expect(skipFor(1)).toBe(PAGE_SIZE)
    expect(skipFor(2)).toBe(PAGE_SIZE * 2)
  })
})

describe('takeForFetch', () => {
  it('requests one more than a full page', () => {
    expect(takeForFetch()).toBe(PAGE_SIZE + 1)
  })
})

describe('splitPage', () => {
  it('reports no next page when fewer than PAGE_SIZE items come back', () => {
    const result = splitPage([1, 2, 3])
    expect(result.items).toEqual([1, 2, 3])
    expect(result.hasNextPage).toBe(false)
  })

  it('reports no next page when exactly PAGE_SIZE items come back', () => {
    const items = Array.from({ length: PAGE_SIZE }, (_, i) => i)
    const result = splitPage(items)
    expect(result.items).toHaveLength(PAGE_SIZE)
    expect(result.hasNextPage).toBe(false)
  })

  it('reports a next page and trims the extra item when PAGE_SIZE + 1 come back', () => {
    const items = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => i)
    const result = splitPage(items)
    expect(result.items).toHaveLength(PAGE_SIZE)
    expect(result.items).toEqual(items.slice(0, PAGE_SIZE))
    expect(result.hasNextPage).toBe(true)
  })

  it('handles an empty page', () => {
    const result = splitPage([])
    expect(result.items).toEqual([])
    expect(result.hasNextPage).toBe(false)
  })
})

describe('pageAfterDelete', () => {
  it('stays on page 0 even if it becomes empty', () => {
    expect(pageAfterDelete(0, 1)).toBe(0)
  })

  it('stays on the current page if other items remain on it', () => {
    expect(pageAfterDelete(2, 5)).toBe(2)
  })

  it('steps back a page when the deleted row was the only one on a later page', () => {
    expect(pageAfterDelete(2, 1)).toBe(1)
  })
})
