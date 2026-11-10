import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, FileCode2 } from 'lucide-react';
import { jsonToTypeScript } from '../utils/json-to-ts';
import { downloadFile } from '../utils/curl';

interface TypeScriptViewerProps {
  jsonBody?: string | null;
  defaultRootName?: string;
}

export const TypeScriptViewer: React.FC<TypeScriptViewerProps> = ({
  jsonBody,
  defaultRootName = 'ApiResponse',
}) => {
  const [rootName, setRootName] = useState(defaultRootName);
  const [copied, setCopied] = useState(false);

  const tsCode = useMemo(() => {
    if (!jsonBody) return '// No response payload available to generate TypeScript types.';
    return jsonToTypeScript(jsonBody, rootName.trim() || 'ApiResponse');
  }, [jsonBody, rootName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tsCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const filename = `${(rootName.trim() || 'api-response').toLowerCase()}.d.ts`;
    downloadFile(tsCode, filename, 'application/typescript');
  };

  const lines = tsCode.split('\n');

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">TypeScript Generator</span>
          <div className="flex items-center gap-1.5 ml-2">
            <label className="text-[11px] text-slate-400">Root Name:</label>
            <input
              type="text"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              className="px-2 py-0.5 text-xs bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-indigo-500 font-mono w-32"
              placeholder="ApiResponse"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Download .d.ts definition file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.d.ts</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy TypeScript</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code viewer with line numbers */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <div className="table w-full">
          {lines.map((line, idx) => (
            <div key={idx} className="table-row hover:bg-slate-900/40">
              <span className="table-cell select-none text-right pr-4 text-slate-600 w-8">
                {idx + 1}
              </span>
              <span className="table-cell whitespace-pre text-slate-200">
                {formatTsLine(line)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function formatTsLine(line: string): React.ReactNode {
  // Simple syntax highlight helpers for export, interface, type, string, number, boolean
  if (line.trim().startsWith('export interface') || line.trim().startsWith('export type')) {
    return <span className="text-purple-400 font-semibold">{line}</span>;
  }
  if (line.includes(': string;')) {
    return <span className="text-emerald-300">{line}</span>;
  }
  if (line.includes(': number;')) {
    return <span className="text-sky-300">{line}</span>;
  }
  if (line.includes(': boolean;')) {
    return <span className="text-amber-300">{line}</span>;
  }
  if (line.includes('//')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }
  return line;
}

