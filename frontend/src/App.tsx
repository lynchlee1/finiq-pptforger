import React, { useState } from 'react';
import { Layers, Plus, FileText, Settings, Play, Download, Trash2, ChevronRight, Presentation, Sparkles, LayoutTemplate, Upload, FileJson, X } from 'lucide-react';
import { TemplateModal } from './components/TemplateModal';

interface Slide {
  id: string;
  slide_index: number;
  data: Record<string, string>;
}

const App: React.FC = () => {
  const [templatePath, setTemplatePath] = useState<string>('template_ppt.pptx');
  const [templateKeys, setTemplateKeys] = useState<string[]>(['title', 'subtitle']);
  const [slides, setSlides] = useState<Slide[]>([
    { id: '1', slide_index: 0, data: { title: 'Welcome to PPT Forger', subtitle: 'Automate your slides with LLM' } }
  ]);
  const [selectedSlideId, setSelectedSlideId] = useState<string>('1');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [importText, setImportText] = useState('');

  const selectedSlide = slides.find(s => s.id === selectedSlideId);

  const handleTemplateSelected = async (templateName: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.loadTemplate(templateName);
      if (result && result.success) {
        setTemplatePath(templateName);
        setTemplateKeys(result.keys);
        
        // Update all slides to include the new keys
        setSlides(prev => prev.map(slide => {
          const newData = { ...slide.data };
          result.keys.forEach((key: string) => {
            if (newData[key] === undefined) newData[key] = '';
          });
          return { ...slide, data: newData };
        }));
        
        setShowTemplateModal(false);
      }
    } catch (err: any) {
      alert(`Failed to load template: ${err.message || 'Unknown error'}`);
    }
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        throw new Error('Imported data must be a JSON array of slide objects.');
      }
      
      const newSlides = parsed.map((item, idx) => ({
        id: Date.now().toString() + idx,
        slide_index: idx,
        data: typeof item === 'object' && item !== null ? item : {}
      }));
      
      setSlides(newSlides);
      if (newSlides.length > 0) setSelectedSlideId(newSlides[0].id);
      
      // Auto-extract keys from imported data to help UI
      const newKeys = new Set<string>(templateKeys);
      newSlides.forEach(s => Object.keys(s.data).forEach(k => newKeys.add(k)));
      setTemplateKeys(Array.from(newKeys));
      
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      alert(`Invalid JSON: ${err.message}`);
    }
  };

  const addSlide = () => {
    const newId = Date.now().toString();
    const newData: Record<string, string> = {};
    templateKeys.forEach(k => newData[k] = '');
    
    setSlides([...slides, { id: newId, slide_index: slides.length, data: newData }]);
    setSelectedSlideId(newId);
  };

  const updateSlideData = (key: string, value: string) => {
    setSlides(slides.map(s => 
      s.id === selectedSlideId ? { ...s, data: { ...s.data, [key]: value } } : s
    ));
  };

  const addCustomField = () => {
    const newKey = prompt("Enter new field name (e.g., 'chart_title'):");
    if (newKey && newKey.trim() !== '') {
      const key = newKey.trim();
      if (!templateKeys.includes(key)) {
        setTemplateKeys([...templateKeys, key]);
      }
      if (selectedSlide) {
        updateSlideData(key, '');
      }
    }
  };

  const deleteSlide = (id: string) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter(s => s.id !== id);
    const reindexedSlides = newSlides.map((s, idx) => ({ ...s, slide_index: idx }));
    setSlides(reindexedSlides);
    if (selectedSlideId === id) {
      setSelectedSlideId(reindexedSlides[0].id);
    }
  };

  const generatePPT = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        json_version: "1.0.0",
        template: templatePath,
        slides: slides.map(s => ({ slide_index: s.slide_index, ...s.data }))
      };
      // @ts-ignore
      const result = await window.electronAPI.generatePPT(payload);
      alert('PPT Generated Successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to generate PPT');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to extract a display title for the sidebar
  const getSlideDisplayTitle = (data: Record<string, string>) => {
    if (data.title) return data.title;
    const firstVal = Object.values(data).find(v => v.trim() !== '');
    return firstVal || 'Empty Slide';
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground select-none overflow-hidden">
      
      {/* Template Modal */}
      <TemplateModal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
        onSelect={handleTemplateSelected} 
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileJson className="w-5 h-5 text-primary" />
                Import JSON Data
              </h2>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Paste the LLM-generated JSON array here. It will replace your current slides.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-64 border border-slate-200 rounded-xl p-4 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white resize-none"
              placeholder="[\n  {\n    &quot;title&quot;: &quot;Slide 1&quot;,\n    &quot;content&quot;: &quot;...&quot;\n  }\n]"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleImportJSON} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-blue-700 shadow-sm">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Slide Navigator */}
      <aside className="w-72 border-r border-border bg-white flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 shrink-0">
        <div className="h-16 px-5 border-b border-border flex items-center gap-3 shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">PPT Forger</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Slides</div>
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setSelectedSlideId(slide.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${
                selectedSlideId === slide.id 
                ? 'bg-blue-50 border-primary/30 shadow-sm' 
                : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {selectedSlideId === slide.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
              )}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedSlideId === slide.id ? 'text-primary' : 'text-slate-400'}`}>
                  Slide {idx + 1}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedSlideId === slide.id ? 'rotate-90 text-primary' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
              <div className="truncate text-sm font-semibold text-slate-700">
                {getSlideDisplayTitle(slide.data)}
              </div>
            </div>
          ))}
          
          <button 
            onClick={addSlide}
            className="w-full mt-4 py-3 rounded-xl border border-dashed border-slate-300 hover:border-primary/50 hover:bg-blue-50/30 hover:text-primary flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Add Slide
          </button>
        </div>

        <div className="p-4 border-t border-border bg-slate-50/50 shrink-0">
          <button className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all border border-transparent hover:border-slate-200">
            <Settings className="w-4 h-4 text-slate-400" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        
        {/* Topbar (Draggable) */}
        <header 
          className="h-16 border-b border-border flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2 text-sm" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <span className="text-slate-400 font-medium">Projects</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <Presentation className="w-4.5 h-4.5 text-primary" />
              New Presentation
            </span>
          </div>
          <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            >
              <FileJson className="w-4 h-4 text-slate-500" />
              Import JSON
            </button>
            <button 
              onClick={generatePPT}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-primary hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:hover:bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2.5 transition-all shadow-sm shadow-primary/25"
            >
              {isGenerating ? (
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              Generate PPTX
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Canvas Preview */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col items-center justify-start relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />
            
            <div className="w-full max-w-5xl flex justify-between items-end mb-4 z-10">
              <div className="text-sm font-medium text-slate-500">
                Template: <span className="text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200 ml-1">{templatePath.split(/[/\\]/).pop()}</span>
              </div>
              <button 
                onClick={() => setShowTemplateModal(true)}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-primary flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Change Template
              </button>
            </div>

            {/* Dynamic Abstract Preview */}
            <div className="aspect-[16/9] w-full max-w-5xl bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative group flex flex-col z-0 transition-transform duration-300 hover:shadow-2xl hover:shadow-slate-200/60 ring-1 ring-black/5">
              <div className="h-10 border-b border-slate-100 bg-slate-50/50 flex items-center px-4 gap-2 opacity-60">
                 <div className="w-3 h-3 rounded-full bg-slate-300" />
                 <div className="w-3 h-3 rounded-full bg-slate-300" />
                 <div className="w-3 h-3 rounded-full bg-slate-300" />
              </div>

              <div className="flex-1 p-10 flex flex-col relative bg-white overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="relative z-10 w-full h-full flex flex-col gap-6">
                  {/* We map over keys and render them abstractly to give a sense of data presence */}
                  {selectedSlide && Object.entries(selectedSlide.data).map(([key, value], idx) => {
                    if (!value) return null;
                    const isTitle = key.toLowerCase().includes('title');
                    return (
                      <div key={key} className={`w-full ${isTitle ? 'mb-4 text-center' : 'text-left'}`}>
                        <span className="inline-block text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-1 bg-blue-50 px-2 py-0.5 rounded">
                          {key}
                        </span>
                        <div className={`${isTitle ? 'text-4xl font-extrabold text-slate-800' : 'text-lg text-slate-600 leading-relaxed bg-slate-50/50 border border-slate-100 p-4 rounded-xl'}`}>
                          {value}
                        </div>
                      </div>
                    )
                  })}
                  {(!selectedSlide || Object.values(selectedSlide.data).every(v => !v)) && (
                    <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                      Fill in the slide data to see a preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-[340px] border-l border-border bg-white flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.02)] z-10 shrink-0">
            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-white shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <LayoutTemplate className="w-4.5 h-4.5 text-primary" />
                Slide Data
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedSlide ? (
                <div className="space-y-6">
                  {/* Ensure all templateKeys are rendered, even if empty in current slide data */}
                  {Array.from(new Set([...templateKeys, ...Object.keys(selectedSlide.data)])).map((key) => (
                    <div key={key} className="space-y-2 group/field">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        {key}
                      </label>
                      <textarea
                        value={selectedSlide.data[key] || ''}
                        onChange={(e) => updateSlideData(key, e.target.value)}
                        placeholder={`Enter ${key}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-y min-h-[100px] shadow-sm shadow-slate-100/50 leading-relaxed"
                      />
                    </div>
                  ))}
                  
                  <div className="pt-4">
                    <button 
                      onClick={addCustomField}
                      className="w-full py-3.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-primary/50 bg-slate-50 hover:bg-blue-50/50 text-sm font-medium text-slate-600 hover:text-primary flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Field
                    </button>
                  </div>
                  
                  <div className="pt-8 mt-8 border-t border-slate-100">
                     <button 
                       onClick={() => deleteSlide(selectedSlide.id)}
                       disabled={slides.length <= 1}
                       className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                     >
                        <Trash2 className="w-4 h-4" />
                        Delete Slide
                     </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                  <FileText className="w-12 h-12 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">Select a slide to edit its data</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
