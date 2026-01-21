
import React, { useState } from 'react';
import { CleaningData, PhotoEntry } from '../types';

interface CleaningFormProps {
  data: CleaningData;
  onChange: (data: CleaningData) => void;
}

export const CleaningForm: React.FC<CleaningFormProps> = ({ data, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    // 최대 20장 제한 (사장님 요청사항 반영)
    if (data.photos.length + fileArray.length > 20) {
      alert("사진은 최대 20장까지만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    
    try {
      const promises = fileArray.map(file => {
        return new Promise<PhotoEntry>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              id: Math.random().toString(36).substring(2, 11),
              url: reader.result as string,
              status: '전'
            });
          };
          reader.onerror = () => reject(new Error("파일 읽기 실패"));
          reader.readAsDataURL(file);
        });
      });

      const newPhotos = await Promise.all(promises);
      
      onChange({
        ...data,
        photos: [...data.photos, ...newPhotos]
      });
    } catch (error) {
      console.error("파일 처리 중 오류 발생:", error);
      alert("사진 업로드 중 문제가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (id: string) => {
    onChange({
      ...data,
      photos: data.photos.filter(p => p.id !== id)
    });
  };

  const updatePhotoStatus = (id: string, status: PhotoEntry['status']) => {
    onChange({
      ...data,
      photos: data.photos.map(p => p.id === id ? { ...p, status } : p)
    });
  };

  const inputClasses = "w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">지역 (동/구)</label>
          <input 
            type="text" 
            placeholder="예: 영통동"
            value={data.location}
            onChange={(e) => onChange({...data, location: e.target.value})}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">아파트/건물명</label>
          <input 
            type="text" 
            placeholder="예: 영통아이파크"
            value={data.buildingName}
            onChange={(e) => onChange({...data, buildingName: e.target.value})}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">서비스 종류</label>
        <select 
          value={data.serviceType}
          onChange={(e) => onChange({...data, serviceType: e.target.value})}
          className={inputClasses}
        >
          <option>입주청소</option>
          <option>이사청소</option>
          <option>거주청소</option>
          <option>상가청소</option>
          <option>에어컨/세탁기 분해청소</option>
          <option>특수청소 (쓰레기집)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">현장 핵심 메모</label>
        <textarea 
          rows={3}
          placeholder="특이사항을 적어주세요: '주방 기름때 심함', '창틀 먼지 제거 위주' 등"
          value={data.notes}
          onChange={(e) => onChange({...data, notes: e.target.value})}
          className={inputClasses + " resize-none"}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-slate-700">
            현장 사진 업로드 {isUploading && <span className="text-blue-500 animate-pulse ml-2">분석 중...</span>}
          </label>
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${data.photos.length >= 20 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            현재 {data.photos.length} / 20장
          </span>
        </div>
        
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] ${
            isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 bg-slate-50'
          } ${isUploading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
            {isUploading ? (
              <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">최대 20장까지 한 번에 드래그 가능</p>
            <p className="text-xs text-slate-500 mt-1">백서 로직에 따라 AI가 사진을 선별 배치합니다</p>
          </div>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading || data.photos.length >= 20}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
          {data.photos.map((photo, idx) => (
            <div key={photo.id} className="relative bg-white border border-slate-200 rounded-lg overflow-hidden group shadow-sm transition-all hover:border-blue-300">
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded z-10 font-mono">
                #{idx + 1}
              </div>
              <img src={photo.url} className="w-full h-20 object-cover" alt={`현장사진 ${idx}`} />
              <button 
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="p-1 bg-slate-50 border-t border-slate-200 flex gap-0.5">
                {(['전', '후', '과정'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updatePhotoStatus(photo.id, s)}
                    className={`flex-1 text-[9px] py-1 rounded font-bold transition-all ${
                      photo.status === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
