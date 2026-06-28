import { isAdminPassword, setAdminCookie } from "@/app/components/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { password } = await req.json();

  if (!isAdminPassword(password)) {
    return NextResponse.json(
      { error: "Wrong admin password" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  const response = NextResponse.json(
    { isAdmin: true },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
  setAdminCookie(response);
  return response;
}
