"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  ArrowRight,
  Radio,
} from "lucide-react";

interface DiscoveredServer {
  ip: string;
  url: string;
  latency: number;
  hostname?: string;
  isCurrentHost: boolean;
}

export function NetworkScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [subnetPrefix, setSubnetPrefix] = useState("192.168.1.");
  const [scannedCount, setScannedCount] = useState(0);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  /**
   * Probe a single IP address on port 38479 for the Server Gallery API
   */
  const probeServer = async (ip: string): Promise<DiscoveredServer | null> => {
    const targetUrl = `http://${ip}:38479`;
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

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
          const latency = Math.round(performance.now() - startTime);
          const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
          return {
            ip,
            url: targetUrl,
            latency,
            hostname: data.hostname,
            isCurrentHost: currentHost === ip || currentHost === "localhost" || currentHost === "127.0.0.1",
          };
        }
      }
    } catch {
      // Ignore unreachable IP timeout
    }
    return null;
  };

  /**
   * Run multi-batch LAN subnet scanner across 1..254
   */
  const startNetworkScan = useCallback(async () => {
    setIsScanning(true);
    setScannedCount(0);
    setDiscoveredServers([]);
    setStatusMessage("Probing local network subnets on port 38479...");

    const found: DiscoveredServer[] = [];

    // 1. Probe localhost and current window hostname first
    if (typeof window !== "undefined") {
      const selfHost = window.location.hostname;
      const selfProbe = await probeServer(selfHost);
      if (selfProbe) found.push(selfProbe);

      if (selfHost !== "localhost" && selfHost !== "127.0.0.1") {
        const localProbe = await probeServer("127.0.0.1");
        if (localProbe && !found.some((s) => s.ip === "127.0.0.1")) {
          found.push(localProbe);
        }
      }
    }

    setDiscoveredServers([...found]);

    // 2. Determine subnet prefixes to test
    const cleanPrefix = subnetPrefix.endsWith(".") ? subnetPrefix : `${subnetPrefix}.`;
    const ipsToTest: string[] = [];

    for (let i = 1; i <= 254; i++) {
      ipsToTest.push(`${cleanPrefix}${i}`);
    }

    // Process in parallel batches of 25 IPs
    const batchSize = 25;
    for (let i = 0; i < ipsToTest.length; i += batchSize) {
      const batch = ipsToTest.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((ip) => probeServer(ip)));

      for (const res of results) {
        if (res && !found.some((s) => s.ip === res.ip)) {
          found.push(res);
        }
      }

      setScannedCount((prev) => prev + batch.length);
      setDiscoveredServers([...found]);
    }

    setIsScanning(false);
    setStatusMessage(
      found.length > 0
        ? `Found ${found.length} active Server Gallery instance(s)!`
        : "Scan complete. No new servers found on this subnet."
    );
  }, [subnetPrefix]);

  const handleOpenModal = () => {
    setIsOpen(true);
    if (discoveredServers.length === 0 && !isScanning) {
      startNetworkScan();
    }
  };

  const connectToServer = (url: string) => {
    window.location.assign(`${url}/dashboard`);
  };

  return (
    <>
      {/* Header Button Trigger */}
      <Button
        variant="outline"
        size="xs"
        onClick={handleOpenModal}
        className="gap-1.5 border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
        title="Offline LAN Server Network Scanner"
      >
        <Radio className="size-3.5 animate-pulse text-emerald-500" />
        <span className="font-mono text-xs hidden sm:inline">LAN Scanner</span>
      </Button>

      {/* Network Scanner Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6 gap-6">
          <DialogHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                <Wifi className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">LAN Server Scanner</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Automatically discovers Server Gallery instances on your local Wi-Fi / LAN when IP changes.
            </DialogDescription>
          </DialogHeader>

          {/* Subnet Input & Controls */}
          <div className="flex items-center gap-2 bg-muted/20 p-3 rounded-lg border">
            <div className="flex flex-col flex-1 gap-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Subnet Range (Port 38479)
              </label>
              <Input
                value={subnetPrefix}
                onChange={(e) => setSubnetPrefix(e.target.value)}
                placeholder="192.168.1."
                className="h-8 text-xs font-mono"
              />
            </div>
            <Button
              onClick={startNetworkScan}
              disabled={isScanning}
              size="sm"
              className="gap-1.5 mt-4"
            >
              <RefreshCw className={`size-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Scan"}</span>
            </Button>
          </div>

          {/* Progress Indicator */}
          {isScanning && (
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Scanning subnet addresses...</span>
                <span className="font-mono">{scannedCount}/254</span>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-200"
                  style={{ width: `${(scannedCount / 254) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <p className="text-xs font-medium text-muted-foreground">{statusMessage}</p>
          )}

          {/* Discovered Servers List */}
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Discovered Servers
            </h4>

            {discoveredServers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg text-center text-muted-foreground gap-2">
                <WifiOff className="size-6 text-muted-foreground/50" />
                <span className="text-xs">No active servers found on subnet yet.</span>
              </div>
            ) : (
              discoveredServers.map((server) => (
                <div
                  key={server.url}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                      <Server className="size-4" />
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono truncate">{server.ip}:38479</span>
                        {server.isCurrentHost ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                            Current
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            New IP
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Latency: {server.latency}ms {server.hostname ? `• ${server.hostname}` : ""}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    onClick={() => connectToServer(server.url)}
                    className="gap-1 text-xs shrink-0"
                  >
                    <span>Connect</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
