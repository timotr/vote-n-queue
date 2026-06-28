import { clearAdminCookie } from "@/app/components/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { isAdmin: false },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
  clearAdminCookie(response);
  return response;
}
