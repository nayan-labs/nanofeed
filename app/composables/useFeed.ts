/**
 * app/composables/useFeed.ts
 * NanoFeed — Paginated Feed Composable
 *
 * Fetches and manages the home feed with pagination.
 */

import type { PaginatedPosts } from '#shared/types/post'

export const useFeed = () => {
  const filter = useState<'recommended' | 'following'>('feed-filter', () => 'recommended')
  const page = useState<number>('feed-page', () => 1)
  const pageSize = useState<number>('feed-page-size', () => 20)
  const posts = useState<any[]>('feed-posts', () => [])

  const { data, status, refresh: fetchRefresh, error } = useFetch('/api/feed', {
    query: computed(() => ({ 
      page: page.value, 
      pageSize: pageSize.value,
      filter: filter.value 
    })),
    watch: [page, filter],
    lazy: true,
  })

  // Reset feed when filter changes
  watch(filter, () => {
    posts.value = []
    page.value = 1
  })

  // Watch for new data and handle pagination properly
  watch(
    () => data.value,
    (newData: any) => {
      if (!newData?.success) return
      
      const newPosts = newData?.data?.posts ?? []
      
      // Reset posts array when returning to page 1
      if (page.value === 1) {
        posts.value = newPosts
      } else if (newPosts.length > 0) {
        // Deduplication
        const existingIds = new Set(posts.value.map(p => p.id))
        const filteredNewPosts = newPosts.filter((p: any) => !existingIds.has(p.id))
        posts.value = [...posts.value, ...filteredNewPosts]
      }
    },
    { immediate: true, deep: false }
  )

  const feed = computed<PaginatedPosts | null>(() => {
    const d = data.value as unknown as { data?: PaginatedPosts } | null
    return d?.data ?? null
  })

  const hasMore = computed(() => feed.value?.hasMore ?? false)
  const total = computed(() => feed.value?.total ?? 0)
  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')

  const nextPage = () => {
    if (hasMore.value && !isLoading.value) {
      page.value++
    }
  }

  const refresh = async () => {
    posts.value = []
    page.value = 1
    await fetchRefresh()
  }

  return {
    posts,
    feed,
    page,
    filter,
    pageSize,
    hasMore,
    total,
    isLoading,
    error,
    refresh,
    nextPage,
  }
}
