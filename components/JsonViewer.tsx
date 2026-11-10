import React, { useState } from 'react';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpandedDepth?: number;
  maxStringLength?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  initialExpandedDepth = 2,
  maxStringLength = 120,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch {
      // Raw string format
      return (
        <div className="relative font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto border border-slate-800">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="whitespace-pre-wrap break-all">{data}</pre>
        </div>
      );
    }
  }

  return (
    <div className="relative font-mono text-xs bg-slate-950 text-slate-200 p-3.5 rounded-lg border border-slate-800 shadow-inner overflow-x-auto">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-sans font-medium uppercase tracking-wider">
          JSON Response
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-sans"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      <JsonNode
        value={parsedData}
        depth={0}
        initialExpandedDepth={initialExpandedDepth}
        maxStringLength={maxStringLength}
      />
    </div>
  );
};

interface JsonNodeProps {
  keyName?: string;
  value: any;
  depth: number;
  initialExpandedDepth: number;
  maxStringLength: number;
  isLast?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({
  keyName,
  value,
  depth,
  initialExpandedDepth,
  maxStringLength,
  isLast = true,
}) => {
  const [expanded, setExpanded] = useState<boolean>(depth < initialExpandedDepth);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  if (value === null) {
    return (
      <div className="leading-5">
        {keyName && <span className="text-indigo-300">"{keyName}": </span>}
        <span className="text-slate-500 italic">null</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="leading-5">
        {keyName && <span className="text-indigo-300">"{keyName}": </span>}
        <span className="text-amber-400">{value ? 'true' : 'false'}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="leading-5">
        {keyName && <span className="text-indigo-300">"{keyName}": </span>}
        <span className="text-sky-400">{value}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  if (typeof value === 'string') {
    const isTruncated = value.length > maxStringLength;
    const displayValue = isTruncated ? `${value.slice(0, maxStringLength)}...` : value;

    return (
      <div className="leading-5 break-all">
        {keyName && <span className="text-indigo-300">"{keyName}": </span>}
        <span className="text-emerald-400">"{displayValue}"</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  if (isObject) {
    const keys = Object.keys(value);
    const count = keys.length;
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';

    if (count === 0) {
      return (
        <div className="leading-5">
          {keyName && <span className="text-indigo-300">"{keyName}": </span>}
          <span className="text-slate-400">{openBracket}{closeBracket}</span>
          {!isLast && <span className="text-slate-500">,</span>}
        </div>
      );
    }

    return (
      <div className="leading-5">
        <div
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer inline-flex items-center gap-1 hover:bg-slate-900/80 rounded px-1 -ml-1 transition-colors group select-none"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
          )}

          {keyName && <span className="text-indigo-300">"{keyName}": </span>}
          <span className="text-slate-400">{openBracket}</span>
          {!expanded && (
            <span className="text-slate-500 text-[11px] px-1 bg-slate-900 rounded mx-1">
              {isArray ? `${count} items` : `${count} keys`}
            </span>
          )}
          {!expanded && <span className="text-slate-400">{closeBracket}</span>}
          {!expanded && !isLast && <span className="text-slate-500">,</span>}
        </div>

        {expanded && (
          <div className="pl-4 border-l border-slate-800/80 my-0.5 space-y-0.5">
            {keys.map((k, index) => (
              <JsonNode
                key={k}
                keyName={isArray ? undefined : k}
                value={value[k]}
                depth={depth + 1}
                initialExpandedDepth={initialExpandedDepth}
                maxStringLength={maxStringLength}
                isLast={index === keys.length - 1}
              />
            ))}
          </div>
        )}

        {expanded && (
          <div>
            <span className="text-slate-400">{closeBracket}</span>
            {!isLast && <span className="text-slate-500">,</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="leading-5">
      {keyName && <span className="text-indigo-300">"{keyName}": </span>}
      <span className="text-slate-400">{String(value)}</span>
      {!isLast && <span className="text-slate-500">,</span>}
    </div>
  );
};

