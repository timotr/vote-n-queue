import { adminUnauthorizedResponse, isAdminRequest } from '@/app/components/adminAuth';
import { getPlayedData, markGamePlayed } from '@/app/components/playedStore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function playedResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET() {
  return playedResponse(getPlayedData());
}

export async function POST(req) {
  if (!isAdminRequest(req)) return adminUnauthorizedResponse();

  const { name } = await req.json();
  const data = markGamePlayed(name);

  if (!data) {
    return playedResponse({ error: 'Game name is required' }, 400);
  }

  return playedResponse(data);
}
