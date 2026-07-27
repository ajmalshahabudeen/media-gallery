"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  Search,
  RefreshCw,
  Trash2,
  Info,
  AlertTriangle,
  AlertOctagon,
  Eye,
  Laptop,
  Globe,
  Clock,
  User,
  Activity,
  XCircle,
} from "lucide-react";

interface SystemLogItem {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | string;
  type: string;
  message: string;
  userEmail?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  deviceName?: string | null;
  userAgent?: string | null;
  status?: string | null;
  metadata?: string | null;
  attemptCount?: number | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      params.set("limit", "200");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      // Ignore fetch errors
    }
    setLoading(false);
  }, [searchQuery, levelFilter, typeFilter]);

  const logsFetched = useRef(false);

  useEffect(() => {
    if (!logsFetched.current) {
      logsFetched.current = true;
      fetchLogs();
    }
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/logs", {
        method: "DELETE",
      });
      if (res.ok) {
        setIsClearModalOpen(false);
        fetchLogs();
      }
    } catch {
      // Ignore clear error
    } finally {
      setActionLoading(false);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px] uppercase font-mono">
            <AlertOctagon className="size-3" />
            <span>ERROR</span>
          </Badge>
        );
      case "WARN":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] uppercase font-mono">
            <AlertTriangle className="size-3" />
            <span>WARN</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px] uppercase font-mono">
            <Info className="size-3" />
            <span>INFO</span>
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    if (type.includes("MEDIA_VIEW")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30 bg-purple-500/10">
          {type}
        </Badge>
      );
    }
    if (type.includes("SUCCESS") || type.includes("CREATED")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
          {type}
        </Badge>
      );
    }
    if (type.includes("FAILURE") || type.includes("DELETED") || type.includes("BANNED")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono text-destructive border-destructive/30">
          {type}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
        {type}
      </Badge>
    );
  };

  const parseMetadataObject = (metadataStr?: string | null) => {
    if (!metadataStr) return null;
    try {
      return JSON.parse(metadataStr);
    } catch {
      return metadataStr;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <ScrollText className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System & Security Logs</h1>
            <p className="text-xs text-muted-foreground">
              Monitor real-time server activity, login attempts, device IPs, and security events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsClearModalOpen(true)}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            <span>Clear Logs</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card className="shadow-xs border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search logs, email, IP, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Level:</span>
              <Select value={levelFilter} onValueChange={(val) => val && setLevelFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-28">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Event Type:</span>
              <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="MEDIA_VIEW">MEDIA_VIEW (Watched)</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">LOGIN_SUCCESS</SelectItem>
                  <SelectItem value="LOGIN_FAILURE">LOGIN_FAILURE</SelectItem>
                  <SelectItem value="REGISTER_SUCCESS">REGISTER_SUCCESS</SelectItem>
                  <SelectItem value="USER_CREATED">USER_CREATED</SelectItem>
                  <SelectItem value="USER_UPDATED">USER_UPDATED</SelectItem>
                  <SelectItem value="USER_DELETED">USER_DELETED</SelectItem>
                  <SelectItem value="MEDIA_SCAN">MEDIA_SCAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DataTable Card */}
      <Card className="shadow-md overflow-hidden border-border/60">
        <CardHeader className="p-4 border-b bg-card">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Server Log Audit Trajectory</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {totalCount} recorded log(s)
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>IP / Device</TableHead>
                <TableHead className="w-80">Message</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading server audit logs...</span>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No matching log entries recorded.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>

                    <TableCell>{getLevelBadge(log.level)}</TableCell>

                    <TableCell>{getTypeBadge(log.type)}</TableCell>

                    <TableCell className="font-mono text-xs">
                      {log.userEmail ? (
                        <span className="text-foreground font-medium">{log.userEmail}</span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs font-mono">
                        <span className="text-foreground">{log.ipAddress || "—"}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-36">
                          {log.deviceName || "Unknown"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs truncate max-w-80" title={log.message}>
                      {log.message}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailOpen(true);
                        }}
                        className="gap-1 text-xs"
                      >
                        <Eye className="size-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {selectedLog && getLevelBadge(selectedLog.level)}
              {selectedLog && getTypeBadge(selectedLog.type)}
            </div>
            <DialogTitle className="text-base font-bold">Log Record Details</DialogTitle>
            <DialogDescription className="text-xs font-mono break-all">
              Log ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex flex-col gap-4 py-2 text-xs overflow-hidden">
              {/* Event Message Banner */}
              <div className="p-3 rounded-lg bg-muted/40 border flex items-start gap-2.5 min-w-0">
                <Activity className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="font-semibold text-foreground wrap-break-word leading-relaxed">{selectedLog.message}</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 shrink-0" />
                      {new Date(selectedLog.timestamp).toISOString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                    <User className="size-3 shrink-0" /> User Identity
                  </span>
                  <span className="font-mono font-semibold break-all text-xs">
                    {selectedLog.userEmail || "Anonymous / System"}
                  </span>
                  {selectedLog.userId && (
                    <span className="text-[10px] text-muted-foreground font-mono break-all">
                      ID: {selectedLog.userId}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                    <Globe className="size-3 shrink-0" /> Network IP
                  </span>
                  <span className="font-mono font-semibold break-all text-xs">
                    {selectedLog.ipAddress || "Local Host / Internal"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Status: {selectedLog.status || "Completed"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border flex flex-col gap-1 col-span-1 sm:col-span-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                    <Laptop className="size-3 shrink-0" /> Client Device & User-Agent
                  </span>
                  <span className="font-semibold text-xs wrap-break-word">{selectedLog.deviceName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono break-all leading-normal">
                    {selectedLog.userAgent || "No user agent header provided"}
                  </span>
                </div>
              </div>

              {/* Parsed JSON Metadata */}
              {selectedLog.metadata && (
                <div className="flex flex-col gap-1.5 mt-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Structured Log Payload (JSON Metadata)
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 font-mono text-[10px] sm:text-[11px] overflow-x-auto max-h-48 border break-all whitespace-pre-wrap max-w-full">
                    {JSON.stringify(parseMetadataObject(selectedLog.metadata), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Logs Modal */}
      <Dialog open={isClearModalOpen} onOpenChange={setIsClearModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertOctagon className="size-5" />
              Clear Audit Log History
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently clear all recorded system log entries from the database?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 mt-2">
            <XCircle className="size-4 shrink-0" />
            <span>This action cannot be undone. Terminal logs will remain active.</span>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsClearModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              disabled={actionLoading}
            >
              {actionLoading ? "Clearing..." : "Clear All Logs"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
