import { getCs2MapResults } from "@/app/components/cs2MapVoteStore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getClientId(req) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? req.headers.get("X-Forwarded-For");
  const realIp = req.headers.get("x-real-ip");
  return (forwardedFor?.split(",")[0] ?? realIp ?? "unknown").replaceAll(":", "").trim() || "unknown";
}

export async function GET(req) {
  return NextResponse.json(getCs2MapResults(getClientId(req)), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
