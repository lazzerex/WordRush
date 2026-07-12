import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

export interface AdminStats {
  totalUsers: number;
  totalTests: number;
  totalCoinsDistributed: number;
  activeUsersToday: number;
  testsToday: number;
  averageWpm: number;
  topPlayers: Array<{
    id: string;
    username: string;
    email: string;
    totalTests: number;
    bestWpm: number;
    coins: number;
  }>;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require admin authentication - throws if not admin
 */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized - Please log in');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_admin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { userId: user.id, email: profile.email || user.email || '' };
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const adminClient = createAdminClient();
    await adminClient.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_action: action,
      p_target_type: targetType || null,
      p_target_id: targetId || null,
      p_details: details || null,
    });
  } catch (error) {
    console.error('[AUDIT_LOG_FAILURE] Admin action was not recorded:', { adminId, action, targetType, targetId, error });
  }
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const adminClient = createAdminClient();

  // Get total users
  const { count: totalUsers } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get total tests
  const { count: totalTests } = await adminClient
    .from('typing_results')
    .select('*', { count: 'exact', head: true });

  // Get total coins distributed
  const { data: coinsData } = await adminClient
    .from('profiles')
    .select('coins');
  
  const totalCoinsDistributed = coinsData?.reduce((sum, p) => sum + (p.coins || 0), 0) || 0;

  // Get tests today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: testsToday } = await adminClient
    .from('typing_results')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  // Get active users today (users who completed tests today)
  const { data: activeUsersData } = await adminClient
    .from('typing_results')
    .select('user_id')
    .gte('created_at', today.toISOString());
  
  const activeUsersToday = new Set(activeUsersData?.map(r => r.user_id)).size;

  // Get average WPM
  const { data: wpmData } = await adminClient
    .from('typing_results')
    .select('wpm');
  
  const averageWpm = wpmData?.length 
    ? wpmData.reduce((sum, r) => sum + r.wpm, 0) / wpmData.length 
    : 0;

  // Get top players
  const { data: topPlayersData } = await adminClient
    .from('profiles')
    .select('id, username, email, coins')
    .order('coins', { ascending: false })
    .limit(10);

  const playerIds = (topPlayersData || []).map((player) => player.id);

  // Single round trip for all top players' results, aggregated in JS,
  // instead of 2 queries per player (count + best wpm).
  const { data: topPlayersResults } = playerIds.length
    ? await adminClient
        .from('typing_results')
        .select('user_id, wpm')
        .in('user_id', playerIds)
    : { data: [] as { user_id: string; wpm: number }[] };

  const resultsByPlayer = new Map<string, { totalTests: number; bestWpm: number }>();
  for (const result of topPlayersResults || []) {
    const entry = resultsByPlayer.get(result.user_id) || { totalTests: 0, bestWpm: 0 };
    entry.totalTests += 1;
    entry.bestWpm = Math.max(entry.bestWpm, result.wpm);
    resultsByPlayer.set(result.user_id, entry);
  }

  const topPlayers = (topPlayersData || []).map((player) => {
    const stats = resultsByPlayer.get(player.id);
    return {
      id: player.id,
      username: player.username || 'Unknown',
      email: player.email || '',
      totalTests: stats?.totalTests || 0,
      bestWpm: stats?.bestWpm || 0,
      coins: player.coins || 0,
    };
  });

  return {
    totalUsers: totalUsers || 0,
    totalTests: totalTests || 0,
    totalCoinsDistributed,
    activeUsersToday,
    testsToday: testsToday || 0,
    averageWpm: Math.round(averageWpm * 10) / 10,
    topPlayers,
  };
}
