import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Download,
  Pause,
  Play,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
  Zap,
} from 'lucide-react';
import { CapturedRequest } from '../utils/types';
import { RequestDetailDrawer } from './RequestDetailDrawer';
import { exportRequestsAsJson, downloadFile } from '../utils/curl';

interface ApiTraceTabProps {
  requests: CapturedRequest[];
  isRecording: boolean;
  onToggleRecording: () => void;
  onClearRequests: () => void;
  onReplayRequest?: (req: CapturedRequest) => void;
  onNotify?: (msg: string) => void;
}

export const ApiTraceTab: React.FC<ApiTraceTabProps> = ({
  requests,
  isRecording,
  onToggleRecording,
  onClearRequests,
  onReplayRequest,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '2xx' | '4xx' | '5xx' | 'ERR'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'fetch' | 'xhr'>('ALL');
  const [onlySlow, setOnlySlow] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesUrl = req.url.toLowerCase().includes(query);
        const matchesMethod = req.method.toLowerCase().includes(query);
        const matchesStatus = String(req.status || '').includes(query);
        const matchesBody = req.responseBody?.toLowerCase().includes(query);
        if (!matchesUrl && !matchesMethod && !matchesStatus && !matchesBody) {
          return false;
        }
      }

      // Method
      if (selectedMethod !== 'ALL' && req.method.toUpperCase() !== selectedMethod) {
        return false;
      }

      // Status
      if (statusFilter === '2xx' && (req.status === undefined || req.status < 200 || req.status >= 300)) {
        return false;
      }
      if (statusFilter === '4xx' && (req.status === undefined || req.status < 400 || req.status >= 500)) {
        return false;
      }
      if (statusFilter === '5xx' && (req.status === undefined || req.status < 500)) {
        return false;
      }
      if (statusFilter === 'ERR' && (req.status !== 0 && !req.error)) {
        return false;
      }

      // Type
      if (typeFilter !== 'ALL' && req.type !== typeFilter) {
        return false;
      }

      // Slow (>500ms)
      if (onlySlow && (req.duration === undefined || req.duration < 500)) {
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, selectedMethod, statusFilter, typeFilter, onlySlow]);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const handleExport = () => {
    if (requests.length === 0) return;
    const jsonStr = exportRequestsAsJson(requests);
    const filename = `apitrace-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    downloadFile(jsonStr, filename);
    onNotify?.(`Exported ${requests.length} requests as JSON`);
  };

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by URL, method, status, response..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleRecording}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
              title={isRecording ? 'Pause network recording' : 'Resume network recording'}
            >
              {isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRecording ? 'Recording' : 'Paused'}</span>
            </button>

            <button
              onClick={onClearRequests}
              disabled={requests.length === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-rose-400 transition-colors"
              title="Clear all recorded requests"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleExport}
              disabled={requests.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition-colors text-xs font-medium"
              title="Export captured requests as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs pt-1">
          {/* Method filters */}
          <div className="flex items-center gap-1">
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                  selectedMethod === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status & Timing filters */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStatusFilter(statusFilter === '2xx' ? 'ALL' : '2xx')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                statusFilter === '2xx'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-emerald-400'
              }`}
            >
              2xx
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === '4xx' ? 'ALL' : '4xx')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                statusFilter === '4xx'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-amber-400'
              }`}
            >
              4xx
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === '5xx' ? 'ALL' : '5xx')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                statusFilter === '5xx'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-rose-400'
              }`}
            >
              5xx
            </button>

            <button
              onClick={() => setOnlySlow(!onlySlow)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                onlySlow
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-rose-300'
              }`}
              title="Filter requests taking > 500ms"
            >
              <Clock className="w-3 h-3" />
              <span>Slow (&gt;500ms)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main split view: list and details drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Requests Table / List */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto ${
            selectedRequest ? 'hidden sm:flex sm:w-1/2 sm:border-r sm:border-slate-800' : 'w-full'
          }`}
        >
          {filteredRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Zap className="w-8 h-8 mb-2 opacity-30 text-indigo-400 animate-pulse" />
              <p className="text-xs font-semibold text-slate-400">
                {requests.length === 0
                  ? 'Listening for Fetch & XHR network traffic...'
                  : 'No requests match your current filters.'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Trigger an API call on the webpage, or adjust filters above to inspect requests.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {filteredRequests.map((req) => {
                const isSelected = req.id === selectedRequestId;
                const statusColor = getStatusColor(req.status);
                const methodColor = getMethodColor(req.method);

                let displayPath = req.url;
                try {
                  const u = new URL(req.url, window.location.origin);
                  displayPath = u.pathname + u.search;
                } catch {
                  // Keep full url
                }

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`flex items-center justify-between gap-3 p-3 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/50 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Method Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${methodColor}`}
                      >
                        {req.method}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${statusColor}`}
                      >
                        {req.status !== undefined && req.status > 0 ? req.status : 'ERR'}
                      </span>

                      {/* URL / Path */}
                      <span
                        className="font-mono text-slate-300 truncate text-[11px]"
                        title={req.url}
                      >
                        {displayPath}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.wasThrottled && (
                        <span className="text-[10px] font-mono text-amber-400" title="Throttled">
                          ⏱️
                        </span>
                      )}

                      {/* Duration */}
                      {req.duration !== undefined && (
                        <span
                          className={`font-mono text-[11px] ${
                            req.isSlow
                              ? 'text-rose-400 font-bold'
                              : req.duration > 300
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {req.duration}ms
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(req.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Request Details Drawer */}
        {selectedRequest && (
          <div className="w-full sm:w-1/2 h-full absolute sm:relative top-0 right-0 z-10">
            <RequestDetailDrawer
              request={selectedRequest}
              onClose={() => setSelectedRequestId(null)}
              onReplay={onReplayRequest}
            />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>{requests.length} requests captured</span>
          {filteredRequests.length !== requests.length && (
            <span className="text-indigo-400">({filteredRequests.length} matching)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span className="text-slate-300 font-sans">Live Hook Active</span>
          </span>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status?: number): string {
  if (!status || status === 0) return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
  if (status >= 200 && status < 300) return 'bg-emerald-500/20 text-emerald-300';
  if (status >= 300 && status < 400) return 'bg-sky-500/20 text-sky-300';
  if (status >= 400 && status < 500) return 'bg-amber-500/20 text-amber-300';
  return 'bg-rose-500/20 text-rose-300';
}

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'POST':
      return 'bg-indigo-500/20 text-indigo-300';
    case 'PUT':
      return 'bg-amber-500/20 text-amber-300';
    case 'DELETE':
      return 'bg-rose-500/20 text-rose-300';
    case 'PATCH':
      return 'bg-purple-500/20 text-purple-300';
    default:
      return 'bg-slate-800 text-slate-300';
  }
}

