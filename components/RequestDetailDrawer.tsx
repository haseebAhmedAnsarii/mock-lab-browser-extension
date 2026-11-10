import React, { useState } from 'react';
import {
  X,
  Clock,
  Terminal,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { CapturedRequest } from '../utils/types';
import { JsonViewer } from './JsonViewer';
import { TypeScriptViewer } from './TypeScriptViewer';
import { requestToCurl } from '../utils/curl';
import { sanitizeHeaders, sanitizeBody } from '../utils/sanitizer';

interface RequestDetailDrawerProps {
  request: CapturedRequest;
  onClose: () => void;
  onReplay?: (request: CapturedRequest) => void;
}

type TabType = 'response' | 'request' | 'headers' | 'typescript' | 'curl';

export const RequestDetailDrawer: React.FC<RequestDetailDrawerProps> = ({
  request,
  onClose,
  onReplay,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('response');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [maskSensitive, setMaskSensitive] = useState(true);

  // Status color helpers (Solid flat badges)
  const getStatusBadge = () => {
    const status = request.status || 0;
    if (status === 0) return { bg: 'bg-app-danger-muted text-app-danger border-app-danger/40', label: 'FAILED' };
    if (status >= 200 && status < 300) return { bg: 'bg-app-success-muted text-app-success border-app-success/40', label: `${status} OK` };
    if (status >= 300 && status < 400) return { bg: 'bg-app-elevated text-app-accent border-app-border', label: `${status} REDIRECT` };
    if (status >= 400 && status < 500) return { bg: 'bg-app-warning-muted text-app-warning border-app-warning/40', label: `${status} CLIENT ERR` };
    return { bg: 'bg-app-danger-muted text-app-danger border-app-danger/40', label: `${status} SERVER ERR` };
  };

  const statusBadge = getStatusBadge();
  const curlCmd = requestToCurl(request);

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1500);
  };

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(request.url, window.location.origin);
  } catch {
    // Relative or invalid
  }

  const queryParams = parsedUrl
    ? Array.from(parsedUrl.searchParams.entries())
    : [];

  const sanitizedReqHeaders = maskSensitive
    ? sanitizeHeaders(request.requestHeaders)
    : request.requestHeaders;

  const sanitizedResHeaders = maskSensitive && request.responseHeaders
    ? sanitizeHeaders(request.responseHeaders)
    : request.responseHeaders || {};

  const displayResponseBody = maskSensitive
    ? sanitizeBody(request.responseBody)
    : request.responseBody;

  const displayRequestBody = maskSensitive
    ? sanitizeBody(request.requestBody)
    : request.requestBody;

  return (
    <div className="flex flex-col h-full bg-app-surface border-l border-app-border text-app-text shadow-2xl animate-in slide-in-from-right duration-150">
      {/* Top Header */}
      <div className="p-4 border-b border-app-border bg-app-bg flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-app-elevated text-app-primary border border-app-border font-mono">
              {request.method}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-app-surface text-app-muted border border-app-border font-mono">
              {request.type.toUpperCase()}
            </span>

            {request.duration !== undefined && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                  request.isSlow
                    ? 'bg-app-danger-muted text-app-danger border-app-danger/40 font-bold'
                    : 'bg-app-surface text-app-muted border-app-border'
                }`}
              >
                <Clock className="w-3 h-3" />
                {request.duration}ms
              </span>
            )}

            {request.wasThrottled && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-app-warning-muted text-app-warning border border-app-warning/40">
                ⏱️ Throttled +{request.throttleDelayMs}ms
              </span>
            )}
          </div>

          <h3
            className="text-xs font-mono text-app-text break-all select-all font-medium leading-relaxed"
            title={request.url}
          >
            {request.url}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-app-muted hover:text-app-text hover:bg-app-elevated transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-app-border bg-app-surface text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-1 rounded font-medium transition-colors border ${
              activeTab === 'response'
                ? 'bg-app-text text-app-bg border-app-text font-bold'
                : 'text-app-muted border-transparent hover:text-app-text'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3 py-1 rounded font-medium transition-colors border ${
              activeTab === 'request'
                ? 'bg-app-text text-app-bg border-app-text font-bold'
                : 'text-app-muted border-transparent hover:text-app-text'
            }`}
          >
            Payload {request.requestBody ? '•' : ''}
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-1 rounded font-medium transition-colors border ${
              activeTab === 'headers'
                ? 'bg-app-text text-app-bg border-app-text font-bold'
                : 'text-app-muted border-transparent hover:text-app-text'
            }`}
          >
            Headers
          </button>
          <button
            onClick={() => setActiveTab('typescript')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors border ${
              activeTab === 'typescript'
                ? 'bg-app-primary text-white border-app-primary font-bold'
                : 'text-app-primary border-transparent hover:bg-app-elevated'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>TypeScript</span>
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1 rounded font-medium transition-colors border ${
              activeTab === 'curl'
                ? 'bg-app-text text-app-bg border-app-text font-bold'
                : 'text-app-muted border-transparent hover:text-app-text'
            }`}
          >
            cURL
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMaskSensitive(!maskSensitive)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans border transition-colors ${
              maskSensitive
                ? 'bg-app-success-muted text-app-success border-app-success/40'
                : 'bg-app-bg text-app-muted border-app-border'
            }`}
            title="Toggle sanitization of passwords, bearer tokens, and cookies"
          >
            <ShieldCheck className="w-3 h-3 text-app-success" />
            <span>{maskSensitive ? 'Masked' : 'Raw'}</span>
          </button>

          {onReplay && (
            <button
              onClick={() => onReplay(request)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-app-bg hover:bg-app-elevated border border-app-border text-app-text transition-colors text-[11px] font-semibold"
              title="Re-send this request"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 bg-app-bg">
        {/* Response Tab */}
        {activeTab === 'response' && (
          <div className="space-y-4">
            {request.error && (
              <div className="p-3 bg-app-danger-muted border border-app-danger/40 rounded flex items-start gap-2.5 text-xs text-app-danger">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Network Error Detected:</p>
                  <p className="font-mono mt-0.5">{request.error}</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-app-text">Response Body</span>
                <span className="text-[11px] text-app-muted font-mono">
                  {request.size ? `${request.size} bytes` : ''}
                </span>
              </div>

              {displayResponseBody ? (
                <JsonViewer data={displayResponseBody} />
              ) : (
                <div className="p-6 text-center text-xs text-app-muted bg-app-surface rounded border border-app-border">
                  Empty response body (HTTP {request.status})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Payload Tab */}
        {activeTab === 'request' && (
          <div className="space-y-4">
            {queryParams.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-app-text mb-2">Query Parameters</h4>
                <div className="bg-app-surface rounded border border-app-border overflow-hidden">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-app-bg border-b border-app-border text-app-muted">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-semibold">Param</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {queryParams.map(([key, value], idx) => (
                        <tr key={idx} className="hover:bg-app-elevated">
                          <td className="px-3 py-1.5 text-app-primary font-bold">{key}</td>
                          <td className="px-3 py-1.5 text-app-text break-all">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-app-text mb-2">Request Body</h4>
              {displayRequestBody ? (
                <JsonViewer data={displayRequestBody} />
              ) : (
                <div className="p-6 text-center text-xs text-app-muted bg-app-surface rounded border border-app-border">
                  No request body payload sent with {request.method} request.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-app-text mb-2 flex items-center justify-between">
                <span>Response Headers</span>
                <span className="text-[11px] text-app-muted font-mono">
                  {Object.keys(sanitizedResHeaders).length} headers
                </span>
              </h4>
              <div className="bg-app-surface rounded border border-app-border overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <tbody className="divide-y divide-app-border">
                    {Object.entries(sanitizedResHeaders).map(([key, val], idx) => (
                      <tr key={idx} className="hover:bg-app-elevated">
                        <td className="px-3 py-1.5 text-app-muted font-semibold w-1/3 break-all">{key}</td>
                        <td className="px-3 py-1.5 text-app-text break-all">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-app-text mb-2 flex items-center justify-between">
                <span>Request Headers</span>
                <span className="text-[11px] text-app-muted font-mono">
                  {Object.keys(sanitizedReqHeaders).length} headers
                </span>
              </h4>
              <div className="bg-app-surface rounded border border-app-border overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <tbody className="divide-y divide-app-border">
                    {Object.entries(sanitizedReqHeaders).map(([key, val], idx) => (
                      <tr key={idx} className="hover:bg-app-elevated">
                        <td className="px-3 py-1.5 text-app-muted font-semibold w-1/3 break-all">{key}</td>
                        <td className="px-3 py-1.5 text-app-text break-all">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TypeScript Generator Tab */}
        {activeTab === 'typescript' && (
          <TypeScriptViewer
            jsonBody={request.responseBody}
            defaultRootName="ApiResponse"
          />
        )}

        {/* cURL Tab */}
        {activeTab === 'curl' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-app-text flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-app-primary" />
                cURL Command
              </span>
              <button
                onClick={handleCopyCurl}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-app-primary hover:bg-app-primary-hover text-white transition-colors font-semibold"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-app-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-app-surface p-3 rounded border border-app-border font-mono text-xs text-app-text overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {curlCmd}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
