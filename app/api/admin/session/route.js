import { isAdminRequest } from "@/app/components/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  return NextResponse.json(
    { isAdmin: isAdminRequest(req) },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
