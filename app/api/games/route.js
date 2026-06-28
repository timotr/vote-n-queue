import { adminUnauthorizedResponse, isAdminRequest } from "@/app/components/adminAuth";
import { addGame, getGames, updateGame } from "@/app/components/gamesStore";
import { renamePlayedGame } from "@/app/components/playedStore";
import { syncVoteStoreFromFile, useVoteStore } from "@/app/components/useVoteStore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function gamesResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function GET() {
  return gamesResponse({ games: getGames() });
}

export async function POST(req) {
  const { name } = await req.json().catch(() => ({}));
  const result = addGame(name);

  if (result.error) {
    return gamesResponse({ error: result.error }, result.status);
  }

  return gamesResponse(result);
}

export async function PUT(req) {
  if (!isAdminRequest(req)) return adminUnauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const result = updateGame(body);

  if (result.error) {
    return gamesResponse({ error: result.error }, result.status);
  }

  if (result.previousName !== result.game.name) {
    syncVoteStoreFromFile();
    useVoteStore.getState().renameGame(result.previousName, result.game.name);
    renamePlayedGame(result.previousName, result.game.name);
  }

  return gamesResponse(result);
}
