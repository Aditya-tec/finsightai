import { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/proxyRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/health");
}
