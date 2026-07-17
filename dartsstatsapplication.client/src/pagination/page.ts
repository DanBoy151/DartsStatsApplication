// Pagination without a backend count endpoint: every fetch asks for one more
// item than PAGE_SIZE. If the extra item comes back, there's a next page;
// either way, only PAGE_SIZE items are ever shown.
export const PAGE_SIZE = 10

export interface Page<T> {
  items: T[]
  hasNextPage: boolean
}

/** How many records to skip for a given (0-based) page index. */
export function skipFor(pageIndex: number): number {
  return pageIndex * PAGE_SIZE
}

/** How many records to request per fetch - one more than PAGE_SIZE, to detect a next page. */
export function takeForFetch(): number {
  return PAGE_SIZE + 1
}

/** Splits a fetch of up to PAGE_SIZE + 1 items into what to display and whether there's more. */
export function splitPage<T>(itemsFetchedWithExtra: T[]): Page<T> {
  return {
    items: itemsFetchedWithExtra.slice(0, PAGE_SIZE),
    hasNextPage: itemsFetchedWithExtra.length > PAGE_SIZE,
  }
}

/**
 * Which page to land on after deleting a row from the current page. Steps back
 * one page if that was the only item on a page beyond the first; otherwise stays put.
 */
export function pageAfterDelete(pageIndex: number, itemsOnPageBeforeDelete: number): number {
  if (itemsOnPageBeforeDelete === 1 && pageIndex > 0) {
    return pageIndex - 1
  }
  return pageIndex
}
