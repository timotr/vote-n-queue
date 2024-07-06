import { useVoteStore } from "@/app/components/useVoteStore";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { name } = await req.json();
  const addVote = useVoteStore.getState().addVote

  if (!name) {
    return new Response(JSON.stringify({ error: 'Game name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log("IP", req.headers.get('X-Forwarded-For'))
  addVote(name, req.headers.get('X-Forwarded-For').split(':').join(''))

  return new Response(JSON.stringify({ message: 'Vote added' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT() {
  const setSpinAngle = useVoteStore.getState().setSpinAngle
  setSpinAngle();
  return NextResponse.json({message: "Done"});
}

export async function DELETE() {
  useVoteStore.getState().resetVotes();
  return NextResponse.json({message: "Done"});
}