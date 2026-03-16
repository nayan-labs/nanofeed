/**
 * app/server/api/notifications/unread-count.get.ts
 * NanoFeed — Notifications API
 * 
 * API endpoint for fetching unread notifications count.
 */

import { defineEventHandler, createError } from 'h3'
import prisma from '../../db/prisma'

export default defineEventHandler(async (event) => {
  const session = event.context.session
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Count unread notifications
  const count = await prisma.notification.count({
    where: {
      userId: user.id,
      read: false
    }
  })

  return { count }
})
