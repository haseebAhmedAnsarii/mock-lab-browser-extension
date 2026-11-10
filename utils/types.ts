export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type RequestType = 'fetch' | 'xhr';

export interface CapturedRequest {
  id: string;
  url: string;
  method: HttpMethod | string;
  type: RequestType;
  startTime: number;
  endTime?: number;
  duration?: number; // ms
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  requestBody?: string | null;
  responseHeaders?: Record<string, string>;
  responseBody?: string | null;
  responseType?: string;
  error?: string | null;
  size?: number; // bytes
  isSlow?: boolean; // > 500ms
  wasThrottled?: boolean;
  throttleDelayMs?: number;
}

export interface LatencyRule {
  id: string;
  name: string;
  urlPattern: string; // glob or substring or regex
  delayMs: number; // synthetic latency in ms
  enabled: boolean;
  mockStatus?: number; // e.g. 500, 404, 429 (optional)
  mockBody?: string;
  failureRate?: number; // 0 to 100 percentage probability of failure
  simulateOffline?: boolean; // simulates network connection drop / TypeError
}

export type TextStressPresetCategory =
  | 'extreme_length'
  | 'overflow_words'
  | 'rtl_languages'
  | 'special_unicode'
  | 'zalgo_diacritics'
  | 'html_xss_vectors'
  | 'zero_width';

export interface TextStressPreset {
  id: string;
  name: string;
  category: TextStressPresetCategory;
  description: string;
  value: string;
}

export interface ChaosState {
  isActive: boolean;
  activePresetId?: string;
  emptyStateActive: boolean;
  overflowHighlightActive: boolean;
  emptyImagesActive: boolean;
  modifiedElementsCount: number;
}

export interface DOMSnapshot {
  originalTextMap: Map<Node, string>;
  originalImgMap: Map<HTMLImageElement, { src: string; srcset?: string; alt?: string }>;
  emptiedContainers: Map<HTMLElement, Node[]>;
}

export interface SanitizerConfig {
  maskAuthorization: boolean;
  maskCookies: boolean;
  maskApiKeys: boolean;
  customMaskKeys: string[];
}
