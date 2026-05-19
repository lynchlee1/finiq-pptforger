import { useState } from "react";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_FEW_SHOT, DEFAULT_SYSTEM_PROMPT_PRICE, DEFAULT_FEW_SHOT_PRICE, DEFAULT_SYSTEM_PROMPT_RISK, DEFAULT_FEW_SHOT_RISK } from "../utils/constants";

export function useGeminiAPI() {
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("gemini_api_keys") || '[""]'); }
    catch { return [""]; }
  });
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("gemini_model") || "gemini-1.5-pro");
  const [subModels1, setSubModels1] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("gemini_sub_models1") || '["gemini-1.5-flash"]'); }
    catch { return ["gemini-1.5-flash"]; }
  });
  const [selectedModel2, setSelectedModel2] = useState(() => localStorage.getItem("gemini_model2") || "gemini-2.5-flash");
  const [subModels2, setSubModels2] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("gemini_sub_models2") || '["gemini-2.0-flash-lite"]'); }
    catch { return ["gemini-2.0-flash-lite"]; }
  });
  const [isDebugMode, setIsDebugMode] = useState(() => localStorage.getItem("gemini_debug_mode") === "true");
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(() => localStorage.getItem("gemini_use_search_grounding") !== "false");
  
  const [customSystemPrompt, setCustomSystemPrompt] = useState(() => localStorage.getItem("gemini_custom_prompt") || "");
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem("gemini_system_prompt") || DEFAULT_SYSTEM_PROMPT);
  const [fewShotExamples, setFewShotExamples] = useState(() => localStorage.getItem("gemini_few_shot") || DEFAULT_FEW_SHOT);

  const [systemPromptPrice, setSystemPromptPrice] = useState(() => localStorage.getItem("gemini_system_prompt_price") || DEFAULT_SYSTEM_PROMPT_PRICE);
  const [customPromptPrice, setCustomPromptPrice] = useState(() => localStorage.getItem("gemini_custom_prompt_price") || "");
  const [fewShotPrice, setFewShotPrice] = useState(() => localStorage.getItem("gemini_few_shot_price") || DEFAULT_FEW_SHOT_PRICE);

  const [systemPromptRisk, setSystemPromptRisk] = useState(() => localStorage.getItem("gemini_system_prompt_risk") || DEFAULT_SYSTEM_PROMPT_RISK);
  const [customPromptRisk, setCustomPromptRisk] = useState(() => localStorage.getItem("gemini_custom_prompt_risk") || "");
  const [fewShotRisk, setFewShotRisk] = useState(() => localStorage.getItem("gemini_few_shot_risk") || DEFAULT_FEW_SHOT_RISK);

  
  const [investmentPoints, setInvestmentPoints] = useState([
    { title: "", contents1: "", contents2: "" },
    { title: "", contents1: "", contents2: "" },
    { title: "", contents1: "", contents2: "" },
  ]);
  const [pricePoints, setPricePoints] = useState([
    { title: "" },
    { title: "" }
  ]);
  const [riskPoints, setRiskPoints] = useState([
    { title: "", contents1: "" },
    { title: "", contents1: "" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrice, setIsGeneratingPrice] = useState(false);
  const [isGeneratingRisk, setIsGeneratingRisk] = useState(false);

  const updateApiKeys = (val: string[]) => { setApiKeys(val); localStorage.setItem("gemini_api_keys", JSON.stringify(val)); };
  const updateModel = (val: string) => { setSelectedModel(val); localStorage.setItem("gemini_model", val); };
  const updateSubModels1 = (val: string[]) => { setSubModels1(val); localStorage.setItem("gemini_sub_models1", JSON.stringify(val)); };
  const updateModel2 = (val: string) => { setSelectedModel2(val); localStorage.setItem("gemini_model2", val); };
  const updateSubModels2 = (val: string[]) => { setSubModels2(val); localStorage.setItem("gemini_sub_models2", JSON.stringify(val)); };
  const updateDebugMode = (val: boolean) => { setIsDebugMode(val); localStorage.setItem("gemini_debug_mode", String(val)); };
  const updateSearchGrounding = (val: boolean) => { setUseSearchGrounding(val); localStorage.setItem("gemini_use_search_grounding", String(val)); };
  const updateCustomPrompt = (val: string) => { setCustomSystemPrompt(val); localStorage.setItem("gemini_custom_prompt", val); };
  const updateSystemPrompt = (val: string) => { setSystemPrompt(val); localStorage.setItem("gemini_system_prompt", val); };
  const updateFewShot = (val: string) => { setFewShotExamples(val); localStorage.setItem("gemini_few_shot", val); };

  const updateSystemPromptPrice = (val: string) => { setSystemPromptPrice(val); localStorage.setItem("gemini_system_prompt_price", val); };
  const updateCustomPromptPrice = (val: string) => { setCustomPromptPrice(val); localStorage.setItem("gemini_custom_prompt_price", val); };
  const updateFewShotPrice = (val: string) => { setFewShotPrice(val); localStorage.setItem("gemini_few_shot_price", val); };

  const updateSystemPromptRisk = (val: string) => { setSystemPromptRisk(val); localStorage.setItem("gemini_system_prompt_risk", val); };
  const updateCustomPromptRisk = (val: string) => { setCustomPromptRisk(val); localStorage.setItem("gemini_custom_prompt_risk", val); };
  const updateFewShotRisk = (val: string) => { setFewShotRisk(val); localStorage.setItem("gemini_few_shot_risk", val); };

  const validApiKeys = apiKeys.filter(k => k.trim() !== "");

  const fetchWithFallback = async (mainModel: string, subModels: string[], bodyParams: any) => {
    if (validApiKeys.length === 0) throw new Error("API Key is missing.");

    const modelsToTry = [mainModel, ...subModels].filter(m => m.trim() !== "");

    for (const currentModel of modelsToTry) {
      for (const currentKey of validApiKeys) {
        console.log(`Trying model: ${currentModel} with key: ${currentKey.substring(0, 5)}...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyParams),
          }
        );

        if (response.ok) {
          return response;
        }

        if (response.status === 429) {
          console.warn(`Rate limit (429) hit for model ${currentModel} with key ${currentKey.substring(0, 5)}...`);
          continue; // Try next key
        }

        // Optional: If other error, throw immediately or continue?
        // We throw to stop on fatal errors (400, 403) to avoid burning all keys
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      console.warn(`All keys exhausted for model ${currentModel}. Falling back to next submodel...`);
    }

    throw new Error("All API keys and Submodels have been exhausted due to Rate Limits (429).");
  };

  const handleGenerateInvestmentPoints = async (companyInfo: string) => {
    if (validApiKeys.length === 0) {
      console.warn("API Key is missing. Skipping investment points generation.");
      return;
    }

    const saveLog = async (prefix: string, content: string) => {
      try {
        // @ts-ignore
        const debugResult = await window.electronAPI.saveDebugFile(`[${prefix}]\n\n${content}`);
        if (debugResult?.success) {
          console.log(`Saved ${prefix} debug file to: ${debugResult.path}`);
        }
      } catch (err) {
        console.error("Failed to force save debug:", err);
      }
    };

    setIsGenerating(true);
    try {
      const modelLower = selectedModel.toLowerCase();
      const canUseGrounding = modelLower.includes("gemini") && useSearchGrounding;

      let basePrompt = systemPrompt;
      if (customSystemPrompt && customSystemPrompt.trim()) basePrompt += `\n\n[추가 시스템 지침]\n${customSystemPrompt.trim()}`;
      if (fewShotExamples && fewShotExamples.trim()) basePrompt += `\n\n[### Examples]\n${fewShotExamples.trim()}`;
      basePrompt += `\n\n[분석할 기업 정보]\n${companyInfo}`;

      let finalJsonText = "";

      if (canUseGrounding) {
        // Step 1: Research with Grounding (Model 1)
        const step1Prompt = basePrompt + `\n\n[지시사항]\n위 기업에 대한 최신 정보를 검색하여 핵심 투자 포인트를 3가지 도출해주세요. 응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "투자포인트1 제목", "contents1": "내용1", "contents2": "내용2" },\n  { "title": "투자포인트2 제목", "contents1": "내용1", "contents2": "내용2" },\n  { "title": "투자포인트3 제목", "contents1": "내용1", "contents2": "내용2" }\n]`;
        
        const step1Body: any = {
          contents: [{ parts: [{ text: step1Prompt }] }],
          tools: [{ googleSearch: {} }]
        };

        const response1 = await fetchWithFallback(selectedModel, subModels1, step1Body);
        
        const data1 = await response1.json();
        const step1Text = data1.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!step1Text) {
          throw new Error("Step 1 (조사) 결과에서 텍스트를 찾을 수 없습니다.");
        }
        await saveLog("Step 1 (Grounding) Raw Response", step1Text);

        // Check if step1Text is already valid JSON
        let step1IsValid = false;
        try {
          let tempText = step1Text;
          const jsonMatch = tempText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            tempText = jsonMatch[1];
          }
          const parsedTemp = JSON.parse(tempText);
          if (Array.isArray(parsedTemp) && parsedTemp.length >= 3) {
            const hasAllFields = parsedTemp.slice(0, 3).every((item: any) => item.title && item.contents1 && item.contents2);
            if (hasAllFields) {
              step1IsValid = true;
              finalJsonText = step1Text;
              console.log("Step 1 successfully generated valid JSON. Skipping Step 2.");
            }
          }
        } catch (e) {
          // Ignore error, step 1 is not valid JSON
        }

        if (!step1IsValid) {
          // Step 2: Format to JSON (Model 2)
          const step2Prompt = `당신은 금융 데이터 변환 전문가입니다. 아래 [조사된 투자 포인트 초안]을 읽고, 내용의 오류나 어색한 부분을 교정한 뒤 반드시 아래 지정된 JSON 배열 형식으로만 출력하세요.\n\n[조사된 투자 포인트 초안]\n${step1Text}\n\n응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "투자포인트1 제목", "contents1": "내용1", "contents2": "내용2" },\n  { "title": "투자포인트2 제목", "contents1": "내용1", "contents2": "내용2" },\n  { "title": "투자포인트3 제목", "contents1": "내용1", "contents2": "내용2" }\n]`;
          
          const step2Body: any = {
            contents: [{ parts: [{ text: step2Prompt }] }],
          };

          if (selectedModel2.toLowerCase().includes("gemini") || selectedModel2.toLowerCase().includes("gemma")) {
            step2Body.generationConfig = {
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    contents1: { type: "STRING" },
                    contents2: { type: "STRING" },
                  },
                  required: ["title", "contents1", "contents2"],
                },
              },
            };
          }

          const response2 = await fetchWithFallback(selectedModel2, subModels2, step2Body);

          const data2 = await response2.json();
          finalJsonText = data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (finalJsonText) {
            await saveLog("Step 2 (JSON Formatting) Raw Response", finalJsonText);
          }
        }
        
      } else {
        // 1-Step Logic (No Grounding)
        let prompt = basePrompt;
        prompt += `\n\n[중요 지침: 오프라인 모드]\n현재 실시간 인터넷 검색을 수행할 수 없습니다. 따라서 프롬프트 규칙 중 "최근 6개월 이내의 최신 정보만 작성" 및 "출처 링크 작성" 제약 조건은 무시하고, 이미 학습된 지식을 바탕으로 기업의 일반적인 핵심 투자 포인트를 3개 작성해 주세요. 절대 빈 결과(empty array)나 빈 값([])을 반환하지 마십시오.\n각 필드(title, contents1, contents2)에는 절대 'notify', 'titles', 'contents1', 'contents2' 같은 더미 텍스트나 플레이스홀더(placeholder)를 사용하지 말고, 신뢰할 수 있고 완성된 한글 금융 분석 문장으로 가득 채워 주십시오.`;
        prompt += `\n\n응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:
[
  { "title": "투자포인트1 제목", "contents1": "내용1", "contents2": "내용2" },
  { "title": "투자포인트2 제목", "contents1": "내용1", "contents2": "내용2" },
  { "title": "투자포인트3 제목", "contents1": "내용1", "contents2": "내용2" }
]`;

        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
        };

        if (modelLower.includes("gemini") || modelLower.includes("gemma")) {
          body.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  contents1: { type: "STRING" },
                  contents2: { type: "STRING" },
                },
                required: ["title", "contents1", "contents2"],
              },
            },
          };
        }

        const response = await fetchWithFallback(selectedModel, subModels1, body);

        const data = await response.json();
        finalJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (finalJsonText) {
          await saveLog("1-Step (No Grounding) Raw Response", finalJsonText);
        }
      }

      if (finalJsonText) {

        let parsed: any = null;
        try {
          let jsonText = finalJsonText;
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }
          parsed = JSON.parse(jsonText);
        } catch (e) {
          throw new Error("AI 응답이 올바른 JSON 형식이 아닙니다.");
        }

        if (Array.isArray(parsed)) {
          if (parsed.length < 3) {
            throw new Error(`AI가 충분한 투자 포인트를 생성하지 못했습니다. (요구: 3개, 반환: ${parsed.length}개)\n다시 시도하거나 프롬프트를 수정해주세요.`);
          }
          const validPoints = parsed.slice(0, 3).map((item: any, i: number) => {
            const title = item.title?.trim();
            const contents1 = item.contents1?.trim();
            const contents2 = item.contents2?.trim();
            
            if (!title || !contents1 || !contents2) {
              throw new Error(`AI가 생성한 ${i + 1}번째 투자 포인트에 누락된 내용이 있습니다.\n다시 시도하거나 프롬프트를 수정해주세요.`);
            }
            
            return { title, contents1, contents2 };
          });
          setInvestmentPoints(validPoints);
        } else {
          throw new Error("AI 응답에서 유효한 JSON 배열을 추출할 수 없습니다.");
        }
      } else {
        throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
      }
    } catch (err: any) {
      console.error("Failed to generate investment points:", err);
      alert(`투자 포인트 생성 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePrice = async (companyInfo: string) => {
    if (validApiKeys.length === 0) return;
    const saveLog = async (prefix: string, content: string) => {
      try {
        // @ts-ignore
        await window.electronAPI.saveDebugFile(`[${prefix}]\n\n${content}`);
      } catch (err) {}
    };

    setIsGeneratingPrice(true);
    try {
      const modelLower = selectedModel.toLowerCase();
      const canUseGrounding = modelLower.includes("gemini") && useSearchGrounding;

      let basePrompt = systemPromptPrice;
      if (customPromptPrice && customPromptPrice.trim()) basePrompt += `\n\n[추가 시스템 지침]\n${customPromptPrice.trim()}`;
      if (fewShotPrice && fewShotPrice.trim()) basePrompt += `\n\n[### Examples]\n${fewShotPrice.trim()}`;
      basePrompt += `\n\n[분석할 기업 정보]\n${companyInfo}`;

      let finalJsonText = "";

      if (canUseGrounding) {
        const step1Prompt = basePrompt + `\n\n[지시사항]\n위 기업에 대한 최신 정보를 검색하여 주가 추이 특징을 2가지 도출해주세요. 응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "주가 흐름 특징 1" },\n  { "title": "주가 흐름 특징 2" }\n]`;
        const step1Body: any = { contents: [{ parts: [{ text: step1Prompt }] }], tools: [{ googleSearch: {} }] };
        const response1 = await fetchWithFallback(selectedModel, subModels1, step1Body);
        const data1 = await response1.json();
        const step1Text = data1.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!step1Text) throw new Error("텍스트를 찾을 수 없습니다.");
        await saveLog("Price Step 1 (Grounding) Raw Response", step1Text);

        let step1IsValid = false;
        try {
          let tempText = step1Text;
          const jsonMatch = tempText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) tempText = jsonMatch[1];
          const parsedTemp = JSON.parse(tempText);
          if (Array.isArray(parsedTemp) && parsedTemp.length >= 2 && parsedTemp.slice(0, 2).every((item: any) => item.title)) {
            step1IsValid = true;
            finalJsonText = step1Text;
          }
        } catch (e) {}

        if (!step1IsValid) {
          const step2Prompt = `아래 초안을 바탕으로 지정된 JSON 배열 형식으로 교정하세요.\n\n[초안]\n${step1Text}\n\n형식:\n[\n  { "title": "주가 흐름 특징 1" },\n  { "title": "주가 흐름 특징 2" }\n]`;
          const step2Body: any = { contents: [{ parts: [{ text: step2Prompt }] }] };
          if (selectedModel2.toLowerCase().includes("gemini") || selectedModel2.toLowerCase().includes("gemma")) {
            step2Body.generationConfig = { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" } }, required: ["title"] } } };
          }
          const response2 = await fetchWithFallback(selectedModel2, subModels2, step2Body);
          const data2 = await response2.json();
          finalJsonText = data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (finalJsonText) await saveLog("Price Step 2 (JSON) Raw Response", finalJsonText);
        }
      } else {
        let prompt = basePrompt + `\n\n응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "주가 흐름 특징 1" },\n  { "title": "주가 흐름 특징 2" }\n]`;
        const body: any = { contents: [{ parts: [{ text: prompt }] }] };
        if (modelLower.includes("gemini") || modelLower.includes("gemma")) {
          body.generationConfig = { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" } }, required: ["title"] } } };
        }
        const response = await fetchWithFallback(selectedModel, subModels1, body);
        const data = await response.json();
        finalJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (finalJsonText) await saveLog("Price 1-Step Raw Response", finalJsonText);
      }

      if (finalJsonText) {
        let jsonText = finalJsonText;
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonText = jsonMatch[1];
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setPricePoints(parsed.slice(0, 2).map((item: any) => ({ title: item.title?.trim() })));
        } else {
          throw new Error("AI 응답 추출 실패");
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`주가 추이 생성 실패: ${err.message}`);
    } finally {
      setIsGeneratingPrice(false);
    }
  };

  const handleGenerateRisk = async (companyInfo: string, financialData?: any) => {
    if (validApiKeys.length === 0) return;
    const saveLog = async (prefix: string, content: string) => {
      try {
        // @ts-ignore
        await window.electronAPI.saveDebugFile(`[${prefix}]\n\n${content}`);
      } catch (err) {}
    };

    setIsGeneratingRisk(true);
    try {
      const modelLower = selectedModel.toLowerCase();
      const canUseGrounding = modelLower.includes("gemini") && useSearchGrounding;

      let basePrompt = systemPromptRisk;
      if (customPromptRisk && customPromptRisk.trim()) basePrompt += `\n\n[추가 시스템 지침]\n${customPromptRisk.trim()}`;
      if (fewShotRisk && fewShotRisk.trim()) basePrompt += `\n\n[### Examples]\n${fewShotRisk.trim()}`;
      basePrompt += `\n\n[분석할 기업 정보]\n${companyInfo}`;
      if (financialData) {
        basePrompt += `\n\n[추가 재무 지표 (2023~2025E)]\n${JSON.stringify(financialData)}`;
      }

      let finalJsonText = "";

      if (canUseGrounding) {
        const step1Prompt = basePrompt + `\n\n[지시사항]\n위 기업에 대한 최신 정보를 검색하여 상환가능성 리스크를 2가지 도출해주세요. 응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "리스크 제목 1", "contents1": "내용 1" },\n  { "title": "리스크 제목 2", "contents1": "내용 2" }\n]`;
        const step1Body: any = { contents: [{ parts: [{ text: step1Prompt }] }], tools: [{ googleSearch: {} }] };
        const response1 = await fetchWithFallback(selectedModel, subModels1, step1Body);
        const data1 = await response1.json();
        const step1Text = data1.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!step1Text) throw new Error("텍스트를 찾을 수 없습니다.");
        await saveLog("Risk Step 1 (Grounding) Raw Response", step1Text);

        let step1IsValid = false;
        try {
          let tempText = step1Text;
          const jsonMatch = tempText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) tempText = jsonMatch[1];
          const parsedTemp = JSON.parse(tempText);
          if (Array.isArray(parsedTemp) && parsedTemp.length >= 2 && parsedTemp.slice(0, 2).every((item: any) => item.title && item.contents1)) {
            step1IsValid = true;
            finalJsonText = step1Text;
          }
        } catch (e) {}

        if (!step1IsValid) {
          const step2Prompt = `아래 초안을 바탕으로 지정된 JSON 배열 형식으로 교정하세요.\n\n[초안]\n${step1Text}\n\n형식:\n[\n  { "title": "리스크 제목 1", "contents1": "내용 1" },\n  { "title": "리스크 제목 2", "contents1": "내용 2" }\n]`;
          const step2Body: any = { contents: [{ parts: [{ text: step2Prompt }] }] };
          if (selectedModel2.toLowerCase().includes("gemini") || selectedModel2.toLowerCase().includes("gemma")) {
            step2Body.generationConfig = { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, contents1: { type: "STRING" } }, required: ["title", "contents1"] } } };
          }
          const response2 = await fetchWithFallback(selectedModel2, subModels2, step2Body);
          const data2 = await response2.json();
          finalJsonText = data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (finalJsonText) await saveLog("Risk Step 2 (JSON) Raw Response", finalJsonText);
        }
      } else {
        let prompt = basePrompt + `\n\n응답은 반드시 다음과 같은 JSON 형식의 배열이어야 합니다:\n[\n  { "title": "리스크 제목 1", "contents1": "내용 1" },\n  { "title": "리스크 제목 2", "contents1": "내용 2" }\n]`;
        const body: any = { contents: [{ parts: [{ text: prompt }] }] };
        if (modelLower.includes("gemini") || modelLower.includes("gemma")) {
          body.generationConfig = { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, contents1: { type: "STRING" } }, required: ["title", "contents1"] } } };
        }
        const response = await fetchWithFallback(selectedModel, subModels1, body);
        const data = await response.json();
        finalJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (finalJsonText) await saveLog("Risk 1-Step Raw Response", finalJsonText);
      }

      if (finalJsonText) {
        let jsonText = finalJsonText;
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonText = jsonMatch[1];
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setRiskPoints(parsed.slice(0, 2).map((item: any) => ({ title: item.title?.trim(), contents1: item.contents1?.trim() })));
        } else {
          throw new Error("AI 응답 추출 실패");
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`리스크 분석 생성 실패: ${err.message}`);
    } finally {
      setIsGeneratingRisk(false);
    }
  };

  return {
    apiKeys, updateApiKeys, validApiKeys,
    selectedModel, updateModel,
    subModels1, updateSubModels1,
    selectedModel2, updateModel2,
    subModels2, updateSubModels2,
    isDebugMode, updateDebugMode,
    useSearchGrounding, updateSearchGrounding,
    customSystemPrompt, updateCustomPrompt,
    systemPrompt, updateSystemPrompt,
    fewShotExamples, updateFewShot,
    systemPromptPrice, updateSystemPromptPrice,
    customPromptPrice, updateCustomPromptPrice,
    fewShotPrice, updateFewShotPrice,
    systemPromptRisk, updateSystemPromptRisk,
    customPromptRisk, updateCustomPromptRisk,
    fewShotRisk, updateFewShotRisk,
    investmentPoints, setInvestmentPoints,
    isGenerating,
    handleGenerateInvestmentPoints,
    pricePoints, setPricePoints,
    isGeneratingPrice, handleGeneratePrice,
    riskPoints, setRiskPoints,
    isGeneratingRisk, handleGenerateRisk,
    resetGeneratedContent: () => {
      setInvestmentPoints([
        { title: "", contents1: "", contents2: "" },
        { title: "", contents1: "", contents2: "" },
        { title: "", contents1: "", contents2: "" },
      ]);
      setPricePoints([
        { title: "" },
        { title: "" }
      ]);
      setRiskPoints([
        { title: "", contents1: "" },
        { title: "", contents1: "" }
      ]);
    }
  };
}
