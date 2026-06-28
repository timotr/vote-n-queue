import { adminUnauthorizedResponse, isAdminRequest } from "@/app/components/adminAuth";
import { resetCs2MapVotes, setCs2MapVote, spinCs2MapWheel } from "@/app/components/cs2MapVoteStore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getClientId(req) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? req.headers.get("X-Forwarded-For");
  const realIp = req.headers.get("x-real-ip");
  return (forwardedFor?.split(",")[0] ?? realIp ?? "unknown").replaceAll(":", "").trim() || "unknown";
}

export async function POST(req) {
  const { mapId } = await req.json();
  const result = setCs2MapVote(mapId, getClientId(req));

  if (!result) {
    return NextResponse.json(
      { error: "Known CS2 map ID is required" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  return NextResponse.json(
    { message: "Vote updated", ...result },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function PUT(req) {
  if (!isAdminRequest(req)) return adminUnauthorizedResponse();

  return NextResponse.json(
    { message: "Done", ...spinCs2MapWheel() },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function DELETE(req) {
  if (!isAdminRequest(req)) return adminUnauthorizedResponse();

  resetCs2MapVotes();
  return NextResponse.json(
    { message: "Done" },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
