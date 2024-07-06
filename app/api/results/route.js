import { useVoteStore } from '@/app/components/useVoteStore';
import { NextResponse } from 'next/server';

export async function GET() {
    let spinAngle = useVoteStore.getState().spinAngle;
    let votes = Object.entries(useVoteStore.getState().votes ?? {}).map(([name = "", votes = 0]) => ({ name, votes }));
    votes.sort((a, b) => b.votes - a.votes)
    return NextResponse.json({votes, spinAngle});
}