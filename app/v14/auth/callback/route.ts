import { NextRequest, NextResponse } from "next/server";
import { createV14Client } from "../../../lib/v14/server";
import { getV14Config } from "../../../lib/v14/config";

export async function GET(request: NextRequest) {
  const { origin } = getV14Config();
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await createV14Client();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/v14", origin));
  }
  return new NextResponse(`Confirmation could not complete in this browser. Return to ${origin}/v14 and sign in after confirming your email, or request a fresh confirmation.`, { status: 400, headers: { "Cache-Control": "no-store" } });
}
