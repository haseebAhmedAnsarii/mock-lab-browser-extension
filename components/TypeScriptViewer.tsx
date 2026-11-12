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
    <div className="dm-ts-root flex flex-col h-full bg-app-bg rounded border border-app-border overflow-hidden">
      {/* Header toolbar */}
      <div className="dm-ts-toolbar flex flex-wrap items-center justify-between gap-2 p-3 bg-app-surface border-b border-app-border">
        <div className="dm-ts-toolbar-left flex items-center gap-2">
          <FileCode2 className="dm-ts-title-icon w-4 h-4 text-app-primary" />
          <span className="dm-ts-title text-xs font-bold text-app-text">TypeScript Generator</span>
          <div className="dm-ts-rootname-group flex items-center gap-1.5 ml-2">
            <label className="dm-ts-rootname-label text-[11px] text-app-muted">Root Name:</label>
            <input
              type="text"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              className="dm-ts-rootname-input px-2 py-0.5 text-xs bg-app-bg border border-app-border rounded text-app-text focus:outline-none focus:border-app-border-focus font-mono w-32"
              placeholder="ApiResponse"
            />
          </div>
        </div>

        <div className="dm-ts-toolbar-right flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="dm-ts-download-btn flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-app-bg hover:bg-app-elevated border border-app-border text-app-text transition-colors font-medium"
            title="Download .d.ts definition file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.d.ts</span>
          </button>
          <button
            onClick={handleCopy}
            className="dm-ts-copy-btn flex items-center gap-1.5 px-3 py-1 text-xs rounded font-semibold bg-app-primary hover:bg-app-primary-hover text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-app-success" />
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
      <div className="dm-ts-code-view flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-app-bg">
        <div className="dm-ts-code-table table w-full">
          {lines.map((line, idx) => (
            <div key={idx} className="dm-ts-code-row table-row hover:bg-app-surface">
              <span className="dm-ts-line-number table-cell select-none text-right pr-4 text-app-faint w-8">
                {idx + 1}
              </span>
              <span className="dm-ts-line-code table-cell whitespace-pre text-app-text">
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
  if (line.trim().startsWith('export interface') || line.trim().startsWith('export type')) {
    return <span className="text-app-primary font-bold">{line}</span>;
  }
  if (line.includes(': string;')) {
    return <span className="text-app-success">{line}</span>;
  }
  if (line.includes(': number;')) {
    return <span className="text-app-accent">{line}</span>;
  }
  if (line.includes(': boolean;')) {
    return <span className="text-app-warning">{line}</span>;
  }
  if (line.includes('//')) {
    return <span className="text-app-faint italic">{line}</span>;
  }
  return line;
}
