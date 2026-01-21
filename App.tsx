
import React, { useState } from 'react';
import { Header } from './components/Header';
import { CleaningForm } from './components/CleaningForm';
import { OutputDisplay } from './components/OutputDisplay';
import { generateMarketingContent } from './services/gemini';
import { BossProfile, CleaningData, GeneratedContent } from './types';

const App: React.FC = () => {
  const [profile, setProfile] = useState<BossProfile>({
    companyName: '클린부스트 홈케어',
    experience: '10년 경력',
    values: '친환경 세제 사용, 꼼꼼한 탈거 청소',
    contact: '010-1234-5678'
  });

  const [cleaningData, setCleaningData] = useState<CleaningData>({
    location: '',
    buildingName: '',
    serviceType: '입주청소',
    notes: '',
    photos: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const handleGenerate = async () => {
    if (!cleaningData.location || !cleaningData.serviceType) {
      alert('필수 정보를 입력해주세요 (지역, 서비스 종류)');
      return;
    }

    if (cleaningData.photos.length === 0) {
      alert('현장 사진을 등록해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generateMarketingContent(cleaningData, profile);
      setGeneratedContent(content);
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : '콘텐츠 생성 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                현장 정보
              </h2>
              <CleaningForm data={cleaningData} onChange={setCleaningData} />
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                업체 정보
              </h2>
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={profile.companyName}
                  onChange={(e) => setProfile(p => ({...p, companyName: e.target.value}))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="업체명"
                />
                <input 
                  type="text" 
                  value={profile.values}
                  onChange={(e) => setProfile(p => ({...p, values: e.target.value}))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="대표 가치 (예: 친환경 세제 사용)"
                />
              </div>
            </section>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-5 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                isGenerating ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? 'AI가 사진 분석 중...' : '✨ 블로그 원고 생성 시작'}
            </button>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7" id="results">
            {generatedContent ? (
              <OutputDisplay content={generatedContent} photos={cleaningData.photos} />
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5"/></svg>
                </div>
                <h3 className="text-slate-600 font-bold mb-2">사장님은 사진만 올려주세요</h3>
                <p className="text-sm">AI가 비슷한 사진끼리 묶어서 비포/애프터로 자동 배치합니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
