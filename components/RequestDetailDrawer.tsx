import React, { useState } from 'react';
import {
  X,
  Clock,
  Terminal,
  FileCode,
  Layers,
  ArrowRight,
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

  // Status color helpers
  const getStatusBadge = () => {
    const status = request.status || 0;
    if (status === 0) return { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', label: 'FAILED' };
    if (status >= 200 && status < 300) return { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: `${status} OK` };
    if (status >= 300 && status < 400) return { bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', label: `${status} REDIRECT` };
    if (status >= 400 && status < 500) return { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: `${status} CLIENT ERR` };
    return { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', label: `${status} SERVER ERR` };
  };

  const statusBadge = getStatusBadge();
  const curlCmd = requestToCurl(request);

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1500);
  };

  // URL extraction
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
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              {request.method}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 font-mono">
              {request.type.toUpperCase()}
            </span>

            {request.duration !== undefined && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                  request.isSlow
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                {request.duration}ms
              </span>
            )}

            {request.wasThrottled && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⏱️ Throttled +{request.throttleDelayMs}ms
              </span>
            )}
          </div>

          <h3
            className="text-xs font-mono text-slate-200 break-all select-all font-medium leading-relaxed"
            title={request.url}
          >
            {request.url}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/90 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'response'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'request'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Payload {request.requestBody ? '•' : ''}
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'headers'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Headers
          </button>
          <button
            onClick={() => setActiveTab('typescript')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'typescript'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>TypeScript</span>
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'curl'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            cURL
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMaskSensitive(!maskSensitive)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-sans border transition-colors ${
              maskSensitive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle sanitization of passwords, bearer tokens, and cookies"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{maskSensitive ? 'Masked' : 'Raw'}</span>
          </button>

          {onReplay && (
            <button
              onClick={() => onReplay(request)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-[11px]"
              title="Re-send this request"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {/* Response Tab */}
        {activeTab === 'response' && (
          <div className="space-y-4">
            {request.error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold">Network Error Detected:</p>
                  <p className="font-mono text-rose-200 mt-0.5">{request.error}</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Response Body</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {request.size ? `${request.size} bytes` : ''}
                </span>
              </div>

              {displayResponseBody ? (
                <JsonViewer data={displayResponseBody} />
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
                  Empty response body (HTTP {request.status})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Payload Tab */}
        {activeTab === 'request' && (
          <div className="space-y-4">
            {/* Query parameters if any */}
            {queryParams.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Query Parameters</h4>
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Param</th>
                        <th className="px-3 py-1.5 text-left font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {queryParams.map(([key, value], idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="px-3 py-1.5 text-indigo-300 font-medium">{key}</td>
                          <td className="px-3 py-1.5 text-slate-300 break-all">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request Body */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Request Body</h4>
              {displayRequestBody ? (
                <JsonViewer data={displayRequestBody} />
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
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
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Response Headers</span>
                <span className="text-[11px] text-slate-500">
                  {Object.keys(sanitizedResHeaders).length} headers
                </span>
              </h4>
              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.entries(sanitizedResHeaders).map(([key, val], idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-3 py-1.5 text-slate-400 font-medium w-1/3 break-all">{key}</td>
                        <td className="px-3 py-1.5 text-slate-200 break-all">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Request Headers</span>
                <span className="text-[11px] text-slate-500">
                  {Object.keys(sanitizedReqHeaders).length} headers
                </span>
              </h4>
              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.entries(sanitizedReqHeaders).map(([key, val], idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-3 py-1.5 text-slate-400 font-medium w-1/3 break-all">{key}</td>
                        <td className="px-3 py-1.5 text-slate-200 break-all">{val}</td>
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
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                cURL Command
              </span>
              <button
                onClick={handleCopyCurl}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
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

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {curlCmd}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

