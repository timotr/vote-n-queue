import { syncVoteStoreFromFile, useVoteStore } from "@/app/components/useVoteStore";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function getClientId(req) {
  const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('X-Forwarded-For');
  const realIp = req.headers.get('x-real-ip');
  return (forwardedFor?.split(',')[0] ?? realIp ?? 'unknown').replaceAll(':', '').trim() || 'unknown';
}

export async function POST(req) {
  syncVoteStoreFromFile();
  const { name, weight } = await req.json();
  const gameName = String(name ?? '').trim();
  const voteWeight = Number(weight);
  const setRankedVote = useVoteStore.getState().setRankedVote
  const clientId = getClientId(req);

  if (!gameName) {
    return new Response(JSON.stringify({ error: 'Game name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (![1, 2, 3].includes(voteWeight)) {
    return new Response(JSON.stringify({ error: 'Vote weight must be 1, 2, or 3' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const myVotes = setRankedVote(gameName, clientId, voteWeight)

  return new Response(JSON.stringify({ message: 'Vote updated', myVotes }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT() {
  syncVoteStoreFromFile();
  const setSpinAngle = useVoteStore.getState().setSpinAngle
  const result = setSpinAngle();
  return NextResponse.json({message: "Done", ...result});
}

export async function DELETE() {
  syncVoteStoreFromFile();
  useVoteStore.getState().resetVotes();
  return NextResponse.json({message: "Done"});
}
