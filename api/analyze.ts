import { GoogleGenAI, Type } from '@google/genai';
import { buildGroups } from '../lib/matching';
import { AnalysisResult, PhotoItem, SiteInfo, SpaceType } from '../types';

const ALLOWED_SPACES: SpaceType[] = ['주방', '화장실', '거실', '방', '베란다', '현관', '방/거실', '기타'];

function parseJsonBody(body: unknown): { siteInfo: SiteInfo; photos: PhotoItem[] } {
  if (!body || typeof body !== 'object') {
    throw new Error('잘못된 요청 형식입니다.');
  }

  const casted = body as { siteInfo?: SiteInfo; photos?: PhotoItem[] };
  if (!casted.siteInfo || !casted.photos || !Array.isArray(casted.photos)) {
    throw new Error('siteInfo 또는 photos가 누락되었습니다.');
  }

  return { siteInfo: casted.siteInfo, photos: casted.photos };
}

function cleanDataUrl(dataUrl: string): string {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

function validateResult(photos: PhotoItem[], raw: any): AnalysisResult {
  const photoResults = Array.isArray(raw?.photos) ? raw.photos : [];
  const normalized = photos.map((_, index) => {
    const found = photoResults.find((item: any) => item?.index === index);
    const space: SpaceType = ALLOWED_SPACES.includes(found?.space) ? found.space : '기타';
    const confidence = typeof found?.confidence === 'number' ? Math.max(0, Math.min(1, found.confidence)) : 0.5;
    return { index, space, confidence };
  });

  const groups = buildGroups(photos, normalized.map((item) => item.space));
  return { photos: normalized, groups };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
      return;
    }

    const { photos } = parseJsonBody(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    if (photos.length === 0) {
      res.status(400).json({ error: '업로드된 사진이 없습니다.' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `당신은 청소 현장 이미지를 공간별로 분류하는 분석기입니다.
사진마다 다음 중 하나의 공간을 선택하세요: 주방, 화장실, 거실, 방, 베란다, 현관.
거실/방이 구분되지 않으면 반드시 방/거실을 사용하세요.
반드시 JSON으로만 응답하세요.`;

    const parts = photos.flatMap((photo, index) => {
      const mimeTypeMatch = photo.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mimeType = mimeTypeMatch?.[1] || 'image/jpeg';
      return [
        { text: `[사진 ${index}] status=${photo.status}` },
        {
          inlineData: {
            data: cleanDataUrl(photo.dataUrl),
            mimeType,
          },
        },
      ];
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }, ...parts] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            photos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.NUMBER },
                  space: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['index', 'space'],
              },
            },
          },
          required: ['photos'],
        },
      },
    });

    if (!response.text) {
      throw new Error('AI 응답이 비어 있습니다.');
    }

    const parsed = JSON.parse(response.text);
    const result = validateResult(photos, parsed);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '사진 분석에 실패했습니다.';
    res.status(500).json({ error: message });
  }
}
