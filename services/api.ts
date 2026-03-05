import { AnalysisResult, BlogResult, PhotoItem, SiteInfo } from '../types';

interface AnalyzePayload {
  siteInfo: SiteInfo;
  photos: PhotoItem[];
}

interface GeneratePayload {
  siteInfo: SiteInfo;
  photos: PhotoItem[];
  analysis: AnalysisResult;
}

async function requestJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && typeof data.error === 'string' && data.error) || `요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export function analyzePhotos(payload: AnalyzePayload): Promise<AnalysisResult> {
  return requestJson<AnalysisResult>('/api/analyze', payload);
}

export function generateSeoBlog(payload: GeneratePayload): Promise<BlogResult> {
  return requestJson<BlogResult>('/api/generate-blog', payload);
}
