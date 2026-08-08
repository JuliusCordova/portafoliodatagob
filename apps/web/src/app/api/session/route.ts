import { NextResponse } from "next/server";
import { resolveWebSession } from "../_lib/identity";

export async function GET(request: Request) {
  const session = resolveWebSession(request);
  return NextResponse.json({ session }, { status: 200 });
}
