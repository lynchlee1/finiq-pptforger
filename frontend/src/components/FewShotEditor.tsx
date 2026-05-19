import React, { useState, useEffect } from "react";
import { DEFAULT_FEW_SHOT } from "../utils/constants";
import { Code, LayoutList, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

type OutputPoint = { title: string; contents: string[] };
type Example = { input: string; output: OutputPoint[] };

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

export const FewShotEditor: React.FC<Props> = ({ value, onChange }) => {
  const [mode, setMode] = useState<"raw" | "form">("form");
  const [examples, setExamples] = useState<Example[]>([]);
  const [parseError, setParseError] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  // Parse raw text into structured form
  useEffect(() => {
    if (mode === "raw") return;
    
    const textToParse = value || DEFAULT_FEW_SHOT;
    try {
      const parts = textToParse.split(/\[입력 예시(?:\s*\d+)?\]/);
      const parsedExamples: Example[] = [];
      
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const splitOut = part.split(/\[출력 예시(?:\s*\d+)?\]/);
        if (splitOut.length === 2) {
          const input = splitOut[0].trim();
          const outputJson = JSON.parse(splitOut[1].trim());
          
          if (!Array.isArray(outputJson)) throw new Error("Output must be an array");
          
          const outputPoints = outputJson.map((item: any) => {
            const contents = [];
            // Extract contents1, contents2, contents3, etc.
            for (let j = 1; j <= 10; j++) {
              if (item[`contents${j}`] !== undefined) {
                contents.push(item[`contents${j}`]);
              } else {
                break;
              }
            }
            if (contents.length === 0 && item.contents) {
               // fallback if they used an array
               if (Array.isArray(item.contents)) contents.push(...item.contents);
            }

            return {
              title: item.title || "",
              contents: contents
            };
          });
          
          parsedExamples.push({ input, output: outputPoints });
        }
      }
      
      if (parsedExamples.length === 0) throw new Error("No valid examples found");
      
      setExamples(parsedExamples);
      setParseError(false);
    } catch (e) {
      setParseError(true);
      setMode("raw");
    }
  }, [value, mode]);

  const updateStructured = (newExamples: Example[]) => {
    const formatted = newExamples.map((ex, i) => {
      const outJson = ex.output.map(pt => {
        const obj: any = { title: pt.title };
        pt.contents.forEach((c, idx) => {
          obj[`contents${idx + 1}`] = c;
        });
        return obj;
      });
      return `[입력 예시${newExamples.length > 1 ? ` ${i + 1}` : ""}]
${ex.input}
[출력 예시${newExamples.length > 1 ? ` ${i + 1}` : ""}]
${JSON.stringify(outJson, null, 2)}`;
    }).join("\n\n");
    
    onChange(formatted);
  };

  const handleInputChange = (idx: number, val: string) => {
    const newEx = [...examples];
    newEx[idx].input = val;
    setExamples(newEx);
    updateStructured(newEx);
  };

  const handleTitleChange = (exIdx: number, ptIdx: number, val: string) => {
    const newEx = [...examples];
    newEx[exIdx].output[ptIdx].title = val;
    setExamples(newEx);
    updateStructured(newEx);
  };

  const handleContentChange = (exIdx: number, ptIdx: number, cIdx: number, val: string) => {
    const newEx = [...examples];
    newEx[exIdx].output[ptIdx].contents[cIdx] = val;
    setExamples(newEx);
    updateStructured(newEx);
  };

  const addExample = () => {
    const newEx = [...examples, { input: "", output: [{ title: "", contents: [] }] }];
    setExamples(newEx);
    setExpandedIndex(newEx.length - 1);
    updateStructured(newEx);
  };

  const removeExample = (idx: number) => {
    if (examples.length <= 1) return;
    const newEx = examples.filter((_, i) => i !== idx);
    setExamples(newEx);
    setExpandedIndex(Math.max(0, expandedIndex > idx ? expandedIndex - 1 : expandedIndex));
    updateStructured(newEx);
  };

  const addPoint = (exIdx: number) => {
    const newEx = [...examples];
    newEx[exIdx].output.push({ title: "", contents: [] });
    setExamples(newEx);
    updateStructured(newEx);
  };

  const removePoint = (exIdx: number, ptIdx: number) => {
    const newEx = [...examples];
    if (newEx[exIdx].output.length <= 1) return;
    newEx[exIdx].output = newEx[exIdx].output.filter((_, i) => i !== ptIdx);
    setExamples(newEx);
    updateStructured(newEx);
  };

  const addContent = (exIdx: number, ptIdx: number) => {
    const newEx = [...examples];
    newEx[exIdx].output[ptIdx].contents.push("");
    setExamples(newEx);
    updateStructured(newEx);
  };

  const removeContent = (exIdx: number, ptIdx: number, cIdx: number) => {
    const newEx = [...examples];
    newEx[exIdx].output[ptIdx].contents = newEx[exIdx].output[ptIdx].contents.filter((_, i) => i !== cIdx);
    setExamples(newEx);
    updateStructured(newEx);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span>Few-shot 예시 (입/출력)</span>
          {parseError && mode === "raw" && (
            <span className="text-red-500 flex items-center gap-1 normal-case tracking-normal">
              <AlertCircle className="w-3 h-3" />
              형식 오류로 텍스트 모드로 전환됨
            </span>
          )}
        </label>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMode("form")}
            disabled={parseError && mode === "raw"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              mode === "form" 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700 disabled:opacity-50"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            구조화(Form)
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              mode === "raw" 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            직접 수정(Raw)
          </button>
        </div>
      </div>

      {mode === "raw" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={DEFAULT_FEW_SHOT}
          rows={12}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-slate-800 focus:bg-white"
        />
      ) : (
        <div className="space-y-4">
          {examples.map((ex, exIdx) => (
            <div key={exIdx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
              <div 
                className="flex items-center justify-between p-4 bg-slate-100/50 cursor-pointer hover:bg-slate-100"
                onClick={() => setExpandedIndex(exIdx === expandedIndex ? -1 : exIdx)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {exIdx + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    기업 예시 {exIdx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {examples.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeExample(exIdx); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="기업 예시 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="p-1 text-slate-400">
                    {expandedIndex === exIdx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {expandedIndex === exIdx && (
                <div className="p-5 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600">입력 예시 (기업 정보)</label>
                    <textarea
                      value={ex.input}
                      onChange={(e) => handleInputChange(exIdx, e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[12px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-slate-700"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600">출력 예시 (투자 포인트)</label>
                      <button
                        onClick={() => addPoint(exIdx)}
                        className="text-[10px] font-bold text-primary hover:text-blue-700 flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        포인트 추가
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {ex.output.map((pt, ptIdx) => (
                        <div key={ptIdx} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white bg-slate-400 px-2 py-0.5 rounded-full">
                              포인트 {ptIdx + 1}
                            </span>
                            {ex.output.length > 1 && (
                              <button
                                onClick={() => removePoint(exIdx, ptIdx)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <textarea
                            value={pt.title}
                            ref={autoResizeTextarea}
                            onChange={(e) => {
                              autoResizeTextarea(e.target);
                              handleTitleChange(exIdx, ptIdx, e.target.value);
                            }}
                            rows={1}
                            placeholder="포인트 제목"
                            className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-[13px] font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/30 resize-none overflow-hidden"
                          />
                          
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            {pt.contents.map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 w-8 shrink-0 text-right">내용 {cIdx + 1}</span>
                                <textarea
                                  value={c}
                                  ref={autoResizeTextarea}
                                  onChange={(e) => {
                                    autoResizeTextarea(e.target);
                                    handleContentChange(exIdx, ptIdx, cIdx, e.target.value);
                                  }}
                                  rows={1}
                                  placeholder={`세부 내용 ${cIdx + 1}`}
                                  className="flex-1 bg-slate-50 border border-slate-100 rounded px-3 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/30 resize-none overflow-hidden"
                                />
                                {pt.contents.length > 0 && (
                                  <button
                                    onClick={() => removeContent(exIdx, ptIdx, cIdx)}
                                    className="p-1 text-slate-300 hover:text-red-500 shrink-0 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => addContent(exIdx, ptIdx)}
                              className="text-[10px] font-bold text-slate-500 hover:text-primary flex items-center gap-1 w-full justify-center py-1.5 bg-slate-50 hover:bg-slate-100 rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              세부 내용 추가
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <button
            onClick={addExample}
            className="w-full py-3 bg-white border border-dashed border-slate-300 text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            새 기업 예시 추가하기
          </button>
        </div>
      )}
    </div>
  );
};
