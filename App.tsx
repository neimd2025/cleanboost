import React, { useMemo, useState } from 'react';
import { analyzePhotos, generateSeoBlog } from './services/api';
import { copyNaverBlogPayload } from './lib/clipboard';
import { mergeAnalysisWithPhotos } from './lib/matching';
import { AnalysisResult, BlogResult, PhotoItem, PhotoStatus, SiteInfo } from './types';

const MAX_PHOTOS = 40;

const STATUS_LABELS: Record<PhotoStatus, string> = {
  before: '전',
  after: '후',
  process: '과정',
};

async function resizeToDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = source;
  });

  const max = 1400;
  let width = image.width;
  let height = image.height;

  if (width > height && width > max) {
    height = Math.round((height * max) / width);
    width = max;
  } else if (height >= width && height > max) {
    width = Math.round((width * max) / height);
    height = max;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('이미지 처리에 실패했습니다.');
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function makePhotoItem(file: File, dataUrl: string): PhotoItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    dataUrl,
    status: 'before',
  };
}

const App: React.FC = () => {
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({
    location: '',
    buildingName: '',
    serviceType: '입주청소',
    notes: '',
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [blog, setBlog] = useState<BlogResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const spaceSummary = useMemo(() => analysis?.groups ?? [], [analysis]);

  const onSiteInfoChange = (key: keyof SiteInfo, value: string) => {
    setSiteInfo((prev) => ({ ...prev, [key]: value }));
  };

  const addFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      return;
    }

    if (photos.length >= MAX_PHOTOS) {
      alert('사진은 최대 40장까지 업로드할 수 있습니다.');
      return;
    }

    const available = MAX_PHOTOS - photos.length;
    const targetFiles = files.slice(0, available);
    if (files.length > available) {
      alert(`최대 ${MAX_PHOTOS}장까지 업로드 가능합니다. ${targetFiles.length}장만 추가됩니다.`);
    }

    setIsUploading(true);
    try {
      const converted = await Promise.all(
        targetFiles.map(async (file) => makePhotoItem(file, await resizeToDataUrl(file))),
      );
      setPhotos((prev) => [...prev, ...converted]);
      setAnalysis(null);
      setBlog(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '사진 업로드 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files);
    }
  };

  const updateStatus = (id: string, status: PhotoStatus) => {
    setPhotos((prev) => prev.map((photo) => (photo.id === id ? { ...photo, status } : photo)));
    setAnalysis(null);
    setBlog(null);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    setAnalysis(null);
    setBlog(null);
  };

  const runAnalyze = async (): Promise<AnalysisResult | null> => {
    if (!siteInfo.location || !siteInfo.serviceType) {
      alert('지역과 서비스 종류를 먼저 입력해주세요.');
      return null;
    }
    if (photos.length === 0) {
      alert('사진을 먼저 업로드해주세요.');
      return null;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzePhotos({ siteInfo, photos });
      setAnalysis(result);
      setPhotos((prev) => mergeAnalysisWithPhotos(prev, result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '분석에 실패했습니다.';
      alert(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runGenerate = async () => {
    if (photos.length === 0) {
      alert('사진을 먼저 업로드해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const currentAnalysis = analysis ?? (await runAnalyze());
      if (!currentAnalysis) {
        return;
      }

      const generated = await generateSeoBlog({
        siteInfo,
        photos,
        analysis: currentAnalysis,
      });
      setBlog(generated);
    } catch (error) {
      const message = error instanceof Error ? error.message : '블로그 생성에 실패했습니다.';
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBlog = async () => {
    if (!blog) {
      alert('복사할 블로그 결과가 없습니다.');
      return;
    }

    try {
      await copyNaverBlogPayload(blog, photos);
      alert('네이버 블로그 복사 완료');
    } catch (error) {
      const message = error instanceof Error ? error.message : '복사에 실패했습니다.';
      alert(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold">CleanBoost AI</h1>
          <p className="text-sm text-slate-600 mt-1">
            현장 정보 입력 → 사진 업로드 → 상태 선택 → AI 분석 → SEO 블로그 생성 → 네이버 블로그 복사
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">현장 정보 입력</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="지역 (동/구)"
                  value={siteInfo.location}
                  onChange={(e) => onSiteInfoChange('location', e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="아파트/건물명"
                  value={siteInfo.buildingName}
                  onChange={(e) => onSiteInfoChange('buildingName', e.target.value)}
                />
              </div>
              <div className="mt-3">
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={siteInfo.serviceType}
                  onChange={(e) => onSiteInfoChange('serviceType', e.target.value)}
                >
                  <option>입주청소</option>
                  <option>이사청소</option>
                  <option>거주청소</option>
                  <option>상가청소</option>
                </select>
              </div>
              <div className="mt-3">
                <textarea
                  className="h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="현장 메모"
                  value={siteInfo.notes}
                  onChange={(e) => onSiteInfoChange('notes', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">사진 업로드</h3>
                <span className="text-sm text-slate-600">
                  {photos.length}/{MAX_PHOTOS}
                </span>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium">드래그 앤 드롭 또는 클릭 업로드</p>
                <p className="mt-1 text-xs text-slate-500">최대 40장</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    if (e.target.files) {
                      void addFiles(e.target.files);
                    }
                  }}
                />
              </div>
              {isUploading && <p className="mt-2 text-sm text-blue-600">이미지 처리 중...</p>}
            </div>

            <div className="max-h-[360px] overflow-auto">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, idx) => (
                  <article key={photo.id} className="rounded-lg border border-slate-200 bg-white">
                    <div className="relative">
                      <img src={photo.dataUrl} alt={photo.name} className="h-24 w-full rounded-t-lg object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        #{idx}
                      </span>
                      <button
                        className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] text-white"
                        onClick={() => removePhoto(photo.id)}
                      >
                        삭제
                      </button>
                    </div>
                    <div className="space-y-1 p-2">
                      <div className="grid grid-cols-3 gap-1">
                        {(['before', 'after', 'process'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(photo.id, status)}
                            className={`rounded px-1 py-1 text-[11px] font-semibold ${
                              photo.status === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{photo.space ? `공간: ${photo.space}` : '공간 미분석'}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                onClick={() => {
                  void runAnalyze();
                }}
                disabled={isAnalyzing || isGenerating}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                {isAnalyzing ? '분석 중...' : 'AI 공간 분석'}
              </button>
              <button
                onClick={() => {
                  void runGenerate();
                }}
                disabled={isGenerating || isAnalyzing}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
              >
                {isGenerating ? '생성 중...' : 'SEO 블로그 생성'}
              </button>
              <button
                onClick={() => {
                  void copyBlog();
                }}
                disabled={!blog}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
              >
                네이버 블로그 복사
              </button>
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">업로드된 사진 미리보기</h2>
              <p className="text-sm text-slate-500 mt-1">우측 패널에서 공간 정렬과 블로그 결과를 확인합니다.</p>
            </div>

            <div>
              <h3 className="font-semibold">공간별 정렬 결과</h3>
              {spaceSummary.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">분석 결과가 아직 없습니다.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {spaceSummary.map((group) => (
                    <div key={group.space} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <strong>{group.space}</strong>
                        <span className="text-xs text-slate-500">사진 {group.imageIndices.length}장</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        before/after 매칭: {group.beforeAfterPairs.length > 0
                          ? group.beforeAfterPairs.map((pair) => `[${pair[0]}, ${pair[1]}]`).join(', ')
                          : '없음'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold">블로그 생성 결과</h3>
              {!blog ? (
                <p className="mt-2 text-sm text-slate-500">블로그를 생성하면 여기 표시됩니다.</p>
              ) : (
                <article className="mt-2 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-lg font-bold">{blog.blog.title}</h4>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{blog.blog.intro}</p>
                  {blog.blog.sections.map((section, index) => (
                    <section key={`${section.subtitle}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <strong>{section.subtitle}</strong>
                        <span className="text-xs uppercase text-slate-500">{section.sectionType}</span>
                      </div>
                      <p className="mb-2 text-xs text-slate-500">imageIndices: [{section.imageIndices.join(', ')}]</p>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{section.body}</p>
                    </section>
                  ))}
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{blog.blog.outro}</p>
                  <div className="flex flex-wrap gap-2">
                    {blog.blog.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </article>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
