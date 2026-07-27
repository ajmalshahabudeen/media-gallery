import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const k in interfaces) {
    const netList = interfaces[k];
    if (netList) {
      for (const net of netList) {
        if (net.family === "IPv4" && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
  }

  const response = NextResponse.json(
    {
      app: "Server Gallery",
      status: "online",
      port: 38479,
      timestamp: Date.now(),
      hostname: os.hostname(),
      localIps: addresses,
    },
    { status: 200 }
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
