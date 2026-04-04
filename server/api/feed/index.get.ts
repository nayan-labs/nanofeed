/**
 * server/api/feed/index.get.ts
 * NanoFeed — GET /api/feed
 *
 * Returns a paginated list of posts in reverse chronological order.
 * Publicly accessible — no authentication required.
 *
 * Query params:
 *   page     (number, default: 1)
 *   pageSize (number, default: 20, max: 50)
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  // Parse and validate params
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const skip = (page - 1) * pageSize
  const filter = String(query.filter ?? 'recommended')

  try {
    // Get current user if authenticated
    let currentUserId: string | null = null
    const session = event.context.session
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      currentUserId = user?.id ?? null
    }

    // Build the query filter — exclude hidden posts and posts from deactivated accounts
    const where: any = {
      hidden: false,
      author: { isActive: true },
    }

    if (filter === 'following') {
      if (!currentUserId) {
        throw createError({
          statusCode: HTTP.UNAUTHORIZED,
          data: errorResponse('You must be logged in to view your following feed'),
        })
      }

      // Get the IDs of users the current user follows
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true }
      })
      const followingIds = following.map(f => f.followingId)
      
      // Inclusion logic: show only from followed users
      where.authorId = { in: followingIds }
    }

    // Fetch posts and total count in parallel
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              role: true,
              verified: true,
            },
          },
          parent: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  role: true,
                  verified: true,
                },
              },
            },
          },
          repostOf: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  role: true,
                  verified: true,
                },
              },
              _count: {
                select: {
                  replies: true,
                  reactions: true,
                  reposts: true,
                }
              }
            },
          },
          hashtags: {
            select: { tag: true },
          },
          reactions: currentUserId ? {
            where: { userId: currentUserId },
            select: { userId: true }
          } : false,
          _count: {
            select: {
              replies: true,
              reactions: true,
              reposts: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ])

    // Map hasReacted status
    const postsWithReactionStatus = posts.map(post => ({
      ...post,
      hasReacted: currentUserId ? (post as any).reactions.length > 0 : false,
      reactions: undefined // Remove reactions array from response
    }))

    return successResponse({
      posts: postsWithReactionStatus,
      total,
      page,
      pageSize,
      hasMore: skip + posts.length < total,
    })
  } catch (error) {
    console.error('[GET /api/feed]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to fetch feed'),
    })
  }
})
