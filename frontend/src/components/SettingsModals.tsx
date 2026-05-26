import React from "react";
import { ChevronLeft, FolderOpen, Plus, Trash2 } from "lucide-react";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_CUSTOM_PROMPT, DEFAULT_FEW_SHOT, DEFAULT_SYSTEM_PROMPT_PRICE, DEFAULT_CUSTOM_PROMPT_PRICE, DEFAULT_FEW_SHOT_PRICE, DEFAULT_SYSTEM_PROMPT_RISK, DEFAULT_CUSTOM_PROMPT_RISK, DEFAULT_FEW_SHOT_RISK } from "../utils/constants";
import { FewShotEditor } from "./FewShotEditor";

interface Props {
  isPromptOpen: boolean;
  setIsPromptOpen: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  geminiAPI: any;
}

const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
  if (el) {
    const parent = el.closest('.overflow-y-auto');
    const scrollPos = parent ? parent.scrollTop : window.scrollY;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (parent) parent.scrollTop = scrollPos;
    else window.scrollTo(window.scrollX, scrollPos);
  }
};

export const SettingsModals: React.FC<Props> = ({ isPromptOpen, setIsPromptOpen, isSettingsOpen, setIsSettingsOpen, geminiAPI }) => {
  const [activePromptTab, setActivePromptTab] = React.useState<"investment" | "price" | "risk">("investment");
  const [previewPrompt, setPreviewPrompt] = React.useState<string | null>(null);
  const [templateDir, setTemplateDir] = React.useState("");
  const [templateDirStatus, setTemplateDirStatus] = React.useState("");

  React.useEffect(() => {
    if (!isSettingsOpen) return;

    window.electronAPI.getTemplateDir().then((result) => {
      setTemplateDir(result.templateDir);
      setTemplateDirStatus("");
    });
  }, [isSettingsOpen]);

  const ListEditor = ({ items, onChange, placeholder, inputType = "text", label, addButtonText = "Add", bgClass = "bg-slate-50", borderClass = "border-slate-200" }: any) => {
    return (
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className="space-y-2">
          {items.map((item: string, idx: number) => (
            <div key={idx} className="flex gap-2">
              <input
                type={inputType}
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx] = e.target.value;
                  onChange(newItems);
                }}
                placeholder={placeholder}
                className={`flex-1 ${bgClass} border ${borderClass} rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all`}
              />
              <button
                onClick={() => {
                  const newItems = items.filter((_: any, i: number) => i !== idx);
                  onChange(newItems);
                }}
                className="p-3 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...items, ""])}
            className="text-[11px] font-bold text-primary hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 p-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> {addButtonText}
          </button>
        </div>
      </div>
    );
  };

  const handleResetDefaults = () => {
    if (window.confirm("현재 탭의 설정을 기본값으로 초기화하시겠습니까?")) {
      if (activePromptTab === "investment") {
        geminiAPI.updateSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        geminiAPI.updateCustomPrompt(DEFAULT_CUSTOM_PROMPT);
        geminiAPI.updateFewShot(DEFAULT_FEW_SHOT);
      } else if (activePromptTab === "price") {
        geminiAPI.updateSystemPromptPrice(DEFAULT_SYSTEM_PROMPT_PRICE);
        geminiAPI.updateCustomPromptPrice(DEFAULT_CUSTOM_PROMPT_PRICE);
        geminiAPI.updateFewShotPrice(DEFAULT_FEW_SHOT_PRICE);
      } else if (activePromptTab === "risk") {
        geminiAPI.updateSystemPromptRisk(DEFAULT_SYSTEM_PROMPT_RISK);
        geminiAPI.updateCustomPromptRisk(DEFAULT_CUSTOM_PROMPT_RISK);
        geminiAPI.updateFewShotRisk(DEFAULT_FEW_SHOT_RISK);
      }
    }
  };

  const handleViewFullPrompt = () => {
    let basePrompt = "";
    if (activePromptTab === "investment") {
      basePrompt = geminiAPI.systemPrompt;
      if (geminiAPI.customSystemPrompt) basePrompt += `\n\n[추가 시스템 지침]\n${geminiAPI.customSystemPrompt.trim()}`;
      if (geminiAPI.fewShotExamples) basePrompt += `\n\n[### Examples]\n${geminiAPI.fewShotExamples.trim()}`;
    } else if (activePromptTab === "price") {
      basePrompt = geminiAPI.systemPromptPrice;
      if (geminiAPI.customPromptPrice) basePrompt += `\n\n[추가 시스템 지침]\n${geminiAPI.customPromptPrice.trim()}`;
      if (geminiAPI.fewShotPrice) basePrompt += `\n\n[### Examples]\n${geminiAPI.fewShotPrice.trim()}`;
    } else if (activePromptTab === "risk") {
      basePrompt = geminiAPI.systemPromptRisk;
      if (geminiAPI.customPromptRisk) basePrompt += `\n\n[추가 시스템 지침]\n${geminiAPI.customPromptRisk.trim()}`;
      if (geminiAPI.fewShotRisk) basePrompt += `\n\n[### Examples]\n${geminiAPI.fewShotRisk.trim()}`;
    }
    setPreviewPrompt(basePrompt);
  };

  const saveTemplateDir = async () => {
    const result = await window.electronAPI.setTemplateDir(templateDir);
    if (result.success) {
      setTemplateDir(result.templateDir || templateDir);
      setTemplateDirStatus("저장됨");
      return true;
    } else {
      setTemplateDirStatus(result.error || "저장 실패");
      return false;
    }
  };

  const handleSelectTemplateDir = async () => {
    const result = await window.electronAPI.selectTemplateDir();
    if (!result.canceled && result.templateDir) {
      setTemplateDir(result.templateDir);
      setTemplateDirStatus("저장됨");
    }
  };

  const handleCloseSettings = async () => {
    if (await saveTemplateDir()) {
      setIsSettingsOpen(false);
    }
  };

  const renderPromptModal = () => {
    if (!isPromptOpen) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Prompt Settings</h2>
            <button onClick={() => setIsPromptOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </button>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActivePromptTab("investment")}
              className={`pb-3 px-6 text-[13px] font-bold transition-all border-b-2 uppercase tracking-wider ${
                activePromptTab === "investment" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              투자 포인트
            </button>
            <button
              onClick={() => setActivePromptTab("price")}
              className={`pb-3 px-6 text-[13px] font-bold transition-all border-b-2 uppercase tracking-wider ${
                activePromptTab === "price" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              주가 추이
            </button>
            <button
              onClick={() => setActivePromptTab("risk")}
              className={`pb-3 px-6 text-[13px] font-bold transition-all border-b-2 uppercase tracking-wider ${
                activePromptTab === "risk" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              상환가능성 분석
            </button>
          </div>

          <div className="space-y-4">
            {activePromptTab === "investment" && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">기본 시스템 프롬프트 (투자 포인트)</label>
                  <textarea value={geminiAPI.systemPrompt} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateSystemPrompt(e.target.value); }} rows={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between"><span>추가 시스템 지침</span><span className="text-[9px] text-slate-400 font-normal">여기에 추가적인 규칙이나 조건들을 작성하세요.</span></label>
                  <textarea value={geminiAPI.customSystemPrompt} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateCustomPrompt(e.target.value); }} placeholder="예: 최신 트렌드를 고려하여 보수적인 관점으로 분석을 수행하세요." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-sans text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <FewShotEditor value={geminiAPI.fewShotExamples} onChange={geminiAPI.updateFewShot} />
              </>
            )}
            
            {activePromptTab === "price" && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">기본 시스템 프롬프트 (주가 추이)</label>
                  <textarea value={geminiAPI.systemPromptPrice} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateSystemPromptPrice(e.target.value); }} rows={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between"><span>추가 시스템 지침</span><span className="text-[9px] text-slate-400 font-normal">여기에 추가적인 규칙이나 조건들을 작성하세요.</span></label>
                  <textarea value={geminiAPI.customPromptPrice} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateCustomPromptPrice(e.target.value); }} placeholder="예: 단기적 변동성보다 장기적 모멘텀에 집중하세요." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-sans text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <FewShotEditor value={geminiAPI.fewShotPrice} onChange={geminiAPI.updateFewShotPrice} />
              </>
            )}

            {activePromptTab === "risk" && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">기본 시스템 프롬프트 (상환가능성 분석)</label>
                  <textarea value={geminiAPI.systemPromptRisk} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateSystemPromptRisk(e.target.value); }} rows={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between"><span>추가 시스템 지침</span><span className="text-[9px] text-slate-400 font-normal">여기에 추가적인 규칙이나 조건들을 작성하세요.</span></label>
                  <textarea value={geminiAPI.customPromptRisk} ref={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e.target); geminiAPI.updateCustomPromptRisk(e.target.value); }} placeholder="예: 풋옵션 행사 가능성을 중점적으로 분석하세요." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-sans text-slate-800 focus:bg-white resize-none overflow-hidden" />
                </div>
                <FewShotEditor value={geminiAPI.fewShotRisk} onChange={geminiAPI.updateFewShotRisk} />
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleViewFullPrompt} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-[15px] whitespace-nowrap">전체 프롬프트 보기</button>
            <button onClick={handleResetDefaults} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-[15px] whitespace-nowrap">초기화</button>
            <button onClick={() => setIsPromptOpen(false)} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-[15px]">Save & Close</button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">API Settings</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Template Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateDir}
                  onChange={(e) => {
                    setTemplateDir(e.target.value);
                    setTemplateDirStatus("");
                  }}
                  onBlur={saveTemplateDir}
                  placeholder="Folder containing deal-summary.pptx and Model.xlsx"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
                <button
                  onClick={handleSelectTemplateDir}
                  className="px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                  title="템플릿 폴더 선택"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
              </div>
              <p className={`text-[10px] px-1 ${templateDirStatus.includes("실패") || templateDirStatus.includes("not found") ? "text-red-500" : "text-slate-400"}`}>
                {templateDirStatus || "이 폴더의 deal-summary.pptx와 Model.xlsx를 사용합니다."}
              </p>
            </div>

            <ListEditor
              label="Google AI Studio API Keys (Fallback 순서대로 시도)"
              items={geminiAPI.apiKeys}
              onChange={geminiAPI.updateApiKeys}
              placeholder="Enter your API key"
              inputType="text"
              addButtonText="Add API Key"
            />
            
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Step 1 Model (조사 및 초안용 메인)</label>
                  <input type="text" value={geminiAPI.selectedModel} onChange={(e) => geminiAPI.updateModel(e.target.value)} placeholder="e.g. gemini-1.5-pro" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
                </div>
                <ListEditor
                  label="Step 1 Submodels (Rate Limit 대비)"
                  items={geminiAPI.subModels1}
                  onChange={geminiAPI.updateSubModels1}
                  placeholder="e.g. gemini-1.5-flash"
                  addButtonText="Add Submodel"
                />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Step 2 Model (포맷 변환 메인)</label>
                  <input type="text" value={geminiAPI.selectedModel2} onChange={(e) => geminiAPI.updateModel2(e.target.value)} placeholder="e.g. gemini-2.5-flash" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
                </div>
                <ListEditor
                  label="Step 2 Submodels (Rate Limit 대비)"
                  items={geminiAPI.subModels2}
                  onChange={geminiAPI.updateSubModels2}
                  placeholder="e.g. gemini-2.0-flash-lite"
                  addButtonText="Add Submodel"
                />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 px-1">그라운딩 기능 활성화 시, Step 1 모델이 검색을 수행하고 Step 2 모델이 JSON으로 변환합니다. API Rate Limit 발생 시 등록된 API Key와 Submodel들을 순회하며 자동으로 재시도합니다.</p>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Google Search Grounding</label>
                <p className="text-[9px] text-slate-500">Use Google Search to fetch up-to-date info and verified links.</p>
              </div>
              <button onClick={() => geminiAPI.updateSearchGrounding(!geminiAPI.useSearchGrounding)} className={`w-12 h-6 rounded-full transition-all relative ${geminiAPI.useSearchGrounding ? "bg-primary" : "bg-slate-300"}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${geminiAPI.useSearchGrounding ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Debug Mode</label>
                <p className="text-[9px] text-slate-500">Save raw AI responses to local file.</p>
              </div>
              <button onClick={() => geminiAPI.updateDebugMode(!geminiAPI.isDebugMode)} className={`w-12 h-6 rounded-full transition-all relative ${geminiAPI.isDebugMode ? "bg-primary" : "bg-slate-300"}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${geminiAPI.isDebugMode ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
          <button onClick={handleCloseSettings} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Close & Save</button>
        </div>
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (previewPrompt === null) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-xl font-bold text-slate-800">최종 프롬프트 미리보기</h2>
            <button onClick={() => setPreviewPrompt(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-6">
            <pre className="text-[13px] text-slate-700 font-mono whitespace-pre-wrap break-words">
              {previewPrompt}
            </pre>
          </div>
          <button onClick={() => setPreviewPrompt(null)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-[15px] shrink-0">닫기</button>
        </div>
      </div>
    );
  };

  return <>{renderPromptModal()}{renderSettingsModal()}{renderPreviewModal()}</>;
};
