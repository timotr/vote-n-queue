import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "vote-n-queue-admin";
const ADMIN_SESSION_TOKEN = randomBytes(32).toString("hex");

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function isAdminPassword(password) {
  const configuredPassword = getAdminPassword();
  return Boolean(configuredPassword) && String(password ?? "") === configuredPassword;
}

export function setAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function isAdminRequest(req) {
  return req.cookies.get(ADMIN_COOKIE_NAME)?.value === ADMIN_SESSION_TOKEN;
}

export function adminUnauthorizedResponse() {
  return NextResponse.json(
    { error: "Admin login required" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
