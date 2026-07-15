import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chatLimiter, checkRateLimit } from '@/lib/ratelimit';
import { validateMessage, sanitizeMessage, MESSAGE_CONSTRAINTS } from '@/lib/chat';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a global chat message
 *     description: Guests post via guestId (no account); logged-in users are verified against the session and use their own Supabase client (RLS applies), guests are inserted via the admin client to bypass RLS.
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, username]
 *             properties:
 *               message:
 *                 type: string
 *               username:
 *                 type: string
 *               isGuest:
 *                 type: boolean
 *               guestId:
 *                 type: string
 *                 description: Required when isGuest is true.
 *     responses:
 *       200:
 *         description: Message stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: object
 *       400:
 *         description: Missing fields or message failed content validation
 *       401:
 *         description: Not authenticated for a non-guest message
 *       429:
 *         description: Rate limit exceeded (5/min per user or guest)
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, guestId, username, isGuest } = body;

    // Validate required fields
    if (!message || !username) {
      return NextResponse.json({ error: 'Message and username are required' }, { status: 400 });
    }

    // Validate guest requirements
    if (isGuest && !guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required for guest messages' },
        { status: 400 }
      );
    }

    // Validate message content
    const validation = validateMessage(message);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get user session for authenticated users
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Verify authenticated user consistency
    if (!isGuest && !user) {
      return NextResponse.json(
        { error: 'Authentication required for non-guest messages' },
        { status: 401 }
      );
    }

    // Rate limiting
    // Use user ID for authenticated users, guest ID for guests
    const rateLimitKey = isGuest ? `guest:${guestId}` : `user:${user?.id}`;

    const rateLimitResult = await checkRateLimit(chatLimiter, rateLimitKey, 5);

    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.reset
        ? Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        : 60;

      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          retryAfter,
        },
        { status: 429 }
      );
    }

    // Sanitize message
    const sanitizedMessage = sanitizeMessage(message);

    // Prepare message data
    const messageData: any = {
      username,
      message: sanitizedMessage,
      is_guest: isGuest,
    };

    if (isGuest) {
      messageData.guest_id = guestId;
      messageData.user_id = null;
    } else {
      messageData.user_id = user!.id;
      messageData.guest_id = null;
    }

    // Insert message using appropriate client
    // For guest messages, we need to use anon client
    // For authenticated messages, use the user's client
    let insertResult;

    if (isGuest) {
      // Use admin client with service role to bypass RLS for guest inserts
      const adminClient = createAdminClient();
      insertResult = await adminClient.from('chat_messages').insert(messageData).select().single();
    } else {
      // Use user's client for authenticated messages
      insertResult = await supabase.from('chat_messages').insert(messageData).select().single();
    }

    const { data: newMessage, error: insertError } = insertResult;

    if (insertError) {
      logger.error('Error inserting chat message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    logger.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get recent global chat messages
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return messages created before this timestamp (pagination cursor)
 *     responses:
 *       200:
 *         description: Messages, oldest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    // Create supabase client (works for both auth and anon)
    const supabase = await createClient();

    let query = supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)); // Cap at 100

    // Pagination support
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      logger.error('Error fetching chat messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Reverse to show oldest first
    const orderedMessages = messages?.reverse() || [];

    return NextResponse.json({
      success: true,
      messages: orderedMessages,
      count: orderedMessages.length,
    });
  } catch (error: any) {
    logger.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/chat:
 *   delete:
 *     summary: Delete one of the current user's own chat messages
 *     description: RLS restricts the delete to rows owned by the caller; guests cannot delete messages.
 *     tags: [Chat]
 *     security:
 *       - supabaseSession: []
 *     parameters:
 *       - in: query
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted (or a no-op if the message wasn't owned by the caller)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing messageId
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Get user session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Delete message (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error deleting chat message:', error);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    logger.error('Chat DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
