import { adminUnauthorizedResponse, isAdminRequest } from "@/app/components/adminAuth";
import { getSettings, updateSettings } from "@/app/components/settingsStore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  return NextResponse.json(getSettings(), {
    headers: NO_STORE_HEADERS,
  });
}

export async function PUT(req) {
  if (!isAdminRequest(req)) return adminUnauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  return NextResponse.json(updateSettings(body), {
    headers: NO_STORE_HEADERS,
  });
}
