import { syncVoteStoreFromFile, useVoteStore } from '@/app/components/useVoteStore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getClientId(req) {
  const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('X-Forwarded-For');
  const realIp = req.headers.get('x-real-ip');
  return (forwardedFor?.split(',')[0] ?? realIp ?? 'unknown').replaceAll(':', '').trim() || 'unknown';
}

export async function GET(req) {
    syncVoteStoreFromFile();
    const state = useVoteStore.getState();
    const clientId = getClientId(req);
    let spinAngle = state.spinAngle;
    let nextGame = state.nextGame ?? "";
    let myVotes = state.rankedVotesByClient?.[clientId] ?? {};
    let votes = Object.entries(state.votes ?? {})
      .map(([name = "", votes = 0]) => ({ name: String(name).trim(), votes }))
      .filter(({ name, votes }) => name && votes > 0);
    votes.sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name))
    return NextResponse.json(
      {votes, spinAngle, nextGame, myVotes},
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
}
