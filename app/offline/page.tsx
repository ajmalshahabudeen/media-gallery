"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff,
  RefreshCw,
  Server,
  ArrowRight,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface DiscoveredServer {
  ip: string;
  url: string;
  latency: number;
  hostname?: string;
}

export default function OfflinePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [subnetPrefix, setSubnetPrefix] = useState("192.168.1.");
  const [statusMessage, setStatusMessage] = useState("Server connection lost. Scanning LAN for new server IP...");
  const [countdown, setCountdown] = useState<number | null>(null);

  /**
   * Probe a single IP address on port 38479 for Server Gallery ping API
   */
  const probeServer = async (ip: string): Promise<DiscoveredServer | null> => {
    const targetUrl = `http://${ip}:38479`;
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const res = await fetch(`${targetUrl}/api/server/ping`, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.app === "Server Gallery") {
          return {
            ip,
            url: targetUrl,
            latency: Math.round(performance.now() - startTime),
            hostname: data.hostname,
          };
        }
      }
    } catch {
      // Ignore unreachable IP
    }
    return null;
  };

  /**
   * Run LAN subnet scanner across multiple common subnets
   */
  const runLANScan = useCallback(async () => {
    setIsScanning(true);
    setScannedCount(0);
    setDiscoveredServers([]);
    setStatusMessage("Scanning local subnets on port 38479 for active Server Gallery instance...");

    const found: DiscoveredServer[] = [];

    // Common subnet prefixes to scan automatically
    const prefixes = [
      subnetPrefix.endsWith(".") ? subnetPrefix : `${subnetPrefix}.`,
      "192.168.1.",
      "192.168.0.",
      "10.0.0.",
    ];

    const uniquePrefixes = Array.from(new Set(prefixes));
    let totalTested = 0;

    for (const prefix of uniquePrefixes) {
      const ipsToTest = Array.from({ length: 254 }, (_, i) => `${prefix}${i + 1}`);

      // Batch 30 IPs at a time
      const batchSize = 30;
      for (let i = 0; i < ipsToTest.length; i += batchSize) {
        const batch = ipsToTest.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((ip) => probeServer(ip)));

        for (const res of results) {
          if (res && !found.some((s) => s.ip === res.ip)) {
            found.push(res);
          }
        }

        totalTested += batch.length;
        setScannedCount(totalTested);
        setDiscoveredServers([...found]);

        // If server found, stop scanning and prepare auto redirect
        if (found.length > 0) {
          setIsScanning(false);
          setStatusMessage(`Active Server Gallery found at ${found[0].url}!`);
          setCountdown(3);
          return;
        }
      }
    }

    setIsScanning(false);
    setStatusMessage(
      found.length > 0
        ? `Found ${found.length} active server(s).`
        : "Scan complete. Make sure Docker server is running on port 38479."
    );
  }, [subnetPrefix]);

  const scanTriggered = useRef(false);

  useEffect(() => {
    if (!scanTriggered.current) {
      scanTriggered.current = true;
      runLANScan();
    }
  }, [runLANScan]);

  // Handle countdown for automatic redirect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (discoveredServers.length > 0) {
        window.location.assign(`${discoveredServers[0].url}/dashboard`);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, discoveredServers]);

  const connectToServer = (url: string) => {
    window.location.assign(`${url}/dashboard`);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border border-border/60 overflow-hidden">
        <CardHeader className="text-center bg-card border-b pb-6">
          <div className="mx-auto size-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <AlertTriangle className="size-7" />
          </div>
          <CardTitle className="text-xl font-bold">Server Disconnected / IP Changed</CardTitle>
          <CardDescription className="text-xs">
            Cannot reach previous server IP. Automatic LAN Scanner is searching for the new IP...
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-6">
          {/* Progress Bar */}
          <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Radio className={`size-3.5 ${isScanning ? "animate-pulse text-emerald-500" : ""}`} />
                LAN Scanner Status
              </span>
              <span className="font-mono text-muted-foreground">{scannedCount} IPs probed</span>
            </div>

            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${Math.min(100, (scannedCount / 254) * 100)}%` }}
              />
            </div>

            <p className="text-xs font-medium text-foreground mt-1">{statusMessage}</p>
          </div>

          {/* Countdown Redirect Banner */}
          {countdown !== null && discoveredServers.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs">New Server IP Found!</span>
                  <span className="text-[11px] font-mono">{discoveredServers[0].url}</span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => connectToServer(discoveredServers[0].url)}
                className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md text-xs"
              >
                <span>Connect ({countdown}s)</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Subnet Manual Config */}
          <div className="flex items-center gap-2">
            <Input
              value={subnetPrefix}
              onChange={(e) => setSubnetPrefix(e.target.value)}
              placeholder="Subnet (e.g. 192.168.1.)"
              className="h-9 text-xs font-mono"
            />
            <Button
              onClick={runLANScan}
              disabled={isScanning}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={`size-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>Rescan</span>
            </Button>
          </div>

          {/* Discovered Servers */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Discovered Server Instances
            </h4>

            {discoveredServers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl text-center text-muted-foreground gap-2">
                <WifiOff className="size-6 text-muted-foreground/40" />
                <span className="text-xs">No active server response detected yet on subnet.</span>
              </div>
            ) : (
              discoveredServers.map((server) => (
                <div
                  key={server.url}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/40 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                      <Server className="size-4" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono">{server.ip}:38479</span>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500">
                          Active
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Latency: {server.latency}ms {server.hostname ? `• ${server.hostname}` : ""}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    onClick={() => connectToServer(server.url)}
                    className="gap-1 text-xs"
                  >
                    <span>Connect</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
