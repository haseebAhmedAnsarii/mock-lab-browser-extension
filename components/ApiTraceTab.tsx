import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Download,
  Pause,
  Play,
  Clock,
  Zap,
} from 'lucide-react';
import { CapturedRequest } from '../utils/types';
import { RequestDetailDrawer } from './RequestDetailDrawer';
import { exportRequestsAsJson, downloadFile } from '../utils/curl';
import { requestsToHar } from '../utils/har';

interface ApiTraceTabProps {
  requests: CapturedRequest[];
  isRecording: boolean;
  onToggleRecording: () => void;
  onClearRequests: () => void;
  onReplayRequest?: (req: CapturedRequest) => void;
  onNotify?: (msg: string) => void;
  // Filter state lifted to parent so it survives tab switches
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedMethod: string;
  setSelectedMethod: (v: string) => void;
  statusFilter: 'ALL' | '2xx' | '4xx' | '5xx' | 'ERR';
  setStatusFilter: (v: 'ALL' | '2xx' | '4xx' | '5xx' | 'ERR') => void;
  typeFilter: 'ALL' | 'fetch' | 'xhr';
  setTypeFilter: (v: 'ALL' | 'fetch' | 'xhr') => void;
  onlySlow: boolean;
  setOnlySlow: (v: boolean) => void;
}

export const ApiTraceTab: React.FC<ApiTraceTabProps> = ({
  requests,
  isRecording,
  onToggleRecording,
  onClearRequests,
  onReplayRequest,
  onNotify,
  searchQuery,
  setSearchQuery,
  selectedMethod,
  setSelectedMethod,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onlySlow,
  setOnlySlow,
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

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

  const handleExportJson = () => {
    if (requests.length === 0) return;
    const jsonStr = exportRequestsAsJson(requests);
    const filename = `apitrace-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    downloadFile(jsonStr, filename);
    onNotify?.(`Exported ${requests.length} requests as JSON`);
  };

  const handleExportHar = () => {
    if (requests.length === 0) return;
    const harData = requestsToHar(requests);
    const harStr = JSON.stringify(harData, null, 2);
    const filename = `apitrace-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.har`;
    downloadFile(harStr, filename, 'application/json');
    onNotify?.(`Exported ${requests.length} requests as HAR 1.2`);
  };

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="dm-apitrace-root flex flex-col h-full overflow-hidden bg-app-bg text-app-text">
      {/* Top Toolbar (Solid Flat) */}
      <div className="dm-apitrace-toolbar p-3 bg-app-surface border-b border-app-border space-y-2.5">
        <div className="dm-apitrace-toolbar-row flex items-center justify-between gap-2 flex-wrap">
          {/* Search bar */}
          <div className="dm-apitrace-search-wrapper relative flex-1 min-w-[180px]">
            <Search className="dm-apitrace-search-icon w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by URL, method, status, response..."
              className="dm-apitrace-search-input w-full pl-8 pr-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text placeholder-app-faint focus:outline-none focus:border-app-border-focus font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="dm-apitrace-search-clear absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="dm-apitrace-action-btns flex items-center gap-1.5">
            <button
              onClick={onToggleRecording}
              className={`dm-apitrace-record-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors border ${
                isRecording
                  ? 'bg-app-danger-muted text-app-danger border-app-danger/40 hover:bg-app-danger/20'
                  : 'bg-app-success-muted text-app-success border-app-success/40 hover:bg-app-success/20'
              }`}
              title={isRecording ? 'Pause network recording' : 'Resume network recording'}
            >
              {isRecording ? <Pause className="dm-apitrace-record-icon w-3.5 h-3.5" /> : <Play className="dm-apitrace-record-icon w-3.5 h-3.5" />}
              <span className="dm-apitrace-record-label">{isRecording ? 'Recording' : 'Paused'}</span>
            </button>

            {confirmingClear ? (
              <div className="dm-apitrace-clear-confirm-group flex items-center gap-1.5 px-2 py-1 bg-app-danger-muted border border-app-danger/40 rounded text-xs animate-in fade-in duration-100">
                <span className="dm-apitrace-clear-confirm-prompt text-[11px] text-app-danger font-semibold">
                  Clear all?
                </span>
                <button
                  onClick={() => {
                    onClearRequests();
                    setConfirmingClear(false);
                  }}
                  className="dm-apitrace-clear-confirm-yes px-2 py-0.5 rounded text-[10px] font-bold bg-app-danger text-white hover:bg-app-danger/90 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmingClear(false)}
                  className="dm-apitrace-clear-confirm-cancel px-1.5 py-0.5 rounded text-[10px] text-app-muted hover:text-app-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingClear(true)}
                disabled={requests.length === 0}
                className="dm-apitrace-clear-btn p-1.5 rounded bg-app-bg hover:bg-app-elevated border border-app-border disabled:opacity-40 text-app-muted hover:text-app-danger transition-colors"
                title="Clear all recorded requests"
              >
                <Trash2 className="dm-apitrace-clear-icon w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleExportHar}
              disabled={requests.length === 0}
              className="dm-apitrace-export-har-btn flex items-center gap-1 px-2.5 py-1.5 rounded bg-app-bg hover:bg-app-elevated border border-app-border disabled:opacity-40 text-app-text transition-colors text-xs font-semibold"
              title="Export captured requests as HAR (Chrome DevTools compatible)"
            >
              <Download className="dm-apitrace-export-har-icon w-3.5 h-3.5" />
              <span className="dm-apitrace-export-har-label">HAR</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={requests.length === 0}
              className="dm-apitrace-export-json-btn flex items-center gap-1 px-2.5 py-1.5 rounded bg-app-primary hover:bg-app-primary-hover disabled:opacity-40 text-white transition-colors text-xs font-semibold"
              title="Export captured requests as JSON"
            >
              <span className="dm-apitrace-export-json-label">JSON</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="dm-apitrace-filter-row flex items-center justify-between gap-2 overflow-x-auto text-xs pt-1">
          {/* Method filters */}
          <div className="dm-apitrace-method-filter-group flex items-center gap-1">
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`dm-apitrace-method-filter-btn px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors border ${
                  selectedMethod === m
                    ? 'bg-app-text text-app-bg border-app-text'
                    : 'bg-app-bg text-app-muted border-app-border hover:text-app-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status & Timing filters */}
          <div className="dm-apitrace-status-filter-group flex items-center gap-1">
            <button
              onClick={() => setStatusFilter(statusFilter === '2xx' ? 'ALL' : '2xx')}
              className={`dm-apitrace-status-2xx-btn px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border ${
                statusFilter === '2xx'
                  ? 'bg-app-success text-white border-app-success'
                  : 'bg-app-bg text-app-muted border-app-border hover:text-app-success'
              }`}
            >
              2xx
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === '4xx' ? 'ALL' : '4xx')}
              className={`dm-apitrace-status-4xx-btn px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border ${
                statusFilter === '4xx'
                  ? 'bg-app-warning text-white border-app-warning'
                  : 'bg-app-bg text-app-muted border-app-border hover:text-app-warning'
              }`}
            >
              4xx
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === '5xx' ? 'ALL' : '5xx')}
              className={`dm-apitrace-status-5xx-btn px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border ${
                statusFilter === '5xx'
                  ? 'bg-app-danger text-white border-app-danger'
                  : 'bg-app-bg text-app-muted border-app-border hover:text-app-danger'
              }`}
            >
              5xx
            </button>

            <button
              onClick={() => setOnlySlow(!onlySlow)}
              className={`dm-apitrace-slow-filter-btn flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border ${
                onlySlow
                  ? 'bg-app-danger text-white border-app-danger'
                  : 'bg-app-bg text-app-muted border-app-border hover:text-app-danger'
              }`}
              title="Filter requests taking > 500ms"
            >
              <Clock className="dm-apitrace-slow-filter-icon w-3 h-3" />
              <span className="dm-apitrace-slow-filter-label">Slow (&gt;500ms)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main split view: list and details drawer */}
      <div className="dm-apitrace-split-view flex-1 flex overflow-hidden relative">
        {/* Requests Table / List */}
        <div
          className={`dm-apitrace-request-list flex-1 flex flex-col overflow-y-auto ${
            selectedRequest ? 'hidden sm:flex sm:w-1/2 sm:border-r sm:border-app-border' : 'w-full'
          }`}
        >
          {filteredRequests.length === 0 ? (
            <div className="dm-apitrace-empty-state flex-1 flex flex-col items-center justify-center p-8 text-center text-app-muted">
              <Zap className="dm-apitrace-empty-icon w-8 h-8 mb-2 opacity-40 text-app-primary" />
              <p className="dm-apitrace-empty-title text-xs font-bold text-app-text">
                {requests.length === 0
                  ? 'Listening for Fetch & XHR network traffic...'
                  : 'No requests match your current filters.'}
              </p>
              <p className="dm-apitrace-empty-hint text-[11px] text-app-muted mt-1 max-w-xs">
                Trigger an API call on the webpage to inspect request metadata.
              </p>
            </div>
          ) : (
            <div className="dm-apitrace-request-list-inner divide-y divide-app-border">
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
                    className={`dm-apitrace-request-row flex items-center justify-between gap-3 p-3 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-app-elevated border-l-2 border-app-primary'
                        : 'hover:bg-app-surface'
                    }`}
                  >
                    <div className="dm-apitrace-request-meta flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Method Badge */}
                      <span
                        className={`dm-apitrace-method-badge px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${methodColor}`}
                      >
                        {req.method}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`dm-apitrace-status-badge px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${statusColor}`}
                      >
                        {req.status !== undefined && req.status > 0 ? req.status : 'ERR'}
                      </span>

                      {/* URL / Path */}
                      <span
                        className="dm-apitrace-url-path font-mono text-app-text truncate text-[11px]"
                        title={req.url}
                      >
                        {displayPath}
                      </span>
                    </div>

                    <div className="dm-apitrace-request-timing flex items-center gap-2 shrink-0">
                      {req.wasThrottled && (
                        <span className="dm-apitrace-throttle-indicator text-[10px] font-mono text-app-warning" title="Throttled">
                          ⏱️
                        </span>
                      )}

                      {/* Duration */}
                      {req.duration !== undefined && (
                        <span
                          className={`dm-apitrace-duration font-mono text-[11px] font-semibold ${
                            req.isSlow
                              ? 'text-app-danger font-bold'
                              : req.duration > 300
                              ? 'text-app-warning'
                              : 'text-app-muted'
                          }`}
                        >
                          {req.duration}ms
                        </span>
                      )}

                      <span className="dm-apitrace-timestamp text-[10px] text-app-faint font-mono">
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
          <div className="dm-apitrace-detail-drawer w-full sm:w-1/2 h-full absolute sm:relative top-0 right-0 z-10 bg-app-surface">
            <RequestDetailDrawer
              request={selectedRequest}
              onClose={() => setSelectedRequestId(null)}
              onReplay={onReplayRequest}
            />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="dm-apitrace-footer px-3 py-1.5 bg-app-surface border-t border-app-border flex items-center justify-between text-[11px] text-app-muted font-mono">
        <div className="dm-apitrace-footer-stats flex items-center gap-3">
          <span className="dm-apitrace-total-count">{requests.length} requests captured</span>
          {filteredRequests.length !== requests.length && (
            <span className="dm-apitrace-filtered-count text-app-primary">({filteredRequests.length} matching)</span>
          )}
        </div>
        <div className="dm-apitrace-footer-status flex items-center gap-2">
          <span className="dm-apitrace-hook-status flex items-center gap-1.5">
            <span className="dm-apitrace-hook-indicator w-1.5 h-1.5 rounded-full bg-app-success inline-block" />
            <span className="dm-apitrace-hook-label text-app-text font-sans font-medium">Hook Active</span>
          </span>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status?: number): string {
  if (!status || status === 0) return 'bg-app-danger-muted text-app-danger border-app-danger/40';
  if (status >= 200 && status < 300) return 'bg-app-success-muted text-app-success border-app-success/40';
  if (status >= 300 && status < 400) return 'bg-app-elevated text-app-accent border-app-border';
  if (status >= 400 && status < 500) return 'bg-app-warning-muted text-app-warning border-app-warning/40';
  return 'bg-app-danger-muted text-app-danger border-app-danger/40';
}

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-app-success-muted text-app-success border-app-success/40';
    case 'POST':
      return 'bg-app-elevated text-app-primary border-app-border';
    case 'PUT':
      return 'bg-app-warning-muted text-app-warning border-app-warning/40';
    case 'DELETE':
      return 'bg-app-danger-muted text-app-danger border-app-danger/40';
    case 'PATCH':
      return 'bg-app-elevated text-app-text border-app-border';
    default:
      return 'bg-app-elevated text-app-muted border-app-border';
  }
}
