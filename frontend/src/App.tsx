import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, FileText, Settings, Play, Download, ChevronRight, Presentation, Sparkles, LayoutTemplate, Upload, FileJson, X, RefreshCw, AlertCircle } from 'lucide-react';
import { TemplateModal } from './components/TemplateModal';
import { PPTXViewer } from 'pptxviewjs';

interface Slide {
  id: string;
  slide_index: number;
  data: Record<string, string>;
}

const App: React.FC = () => {
  const [stockCode, setStockCode] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const [templatePath, setTemplatePath] = useState<string>('Deal_Summary_Template_1.0');
  const [templateKeys, setTemplateKeys] = useState<string[]>(['corp_name_full', 'report_date']);
  const [templateStructure, setTemplateStructure] = useState<any[]>([]);
  const [slideDimensions, setSlideDimensions] = useState({ width: 9144000, height: 5143500 }); // Default 16:9 in EMUs
  const [slides, setSlides] = useState<Slide[]>([
    { id: '1', slide_index: 0, data: { title: 'Welcome to PPT Forger', subtitle: 'Automate your slides with LLM' } }
  ]);
  const [selectedSlideId, setSelectedSlideId] = useState<string>('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  // Sidebar Widths with Persistence
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('leftSidebarWidth');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('rightSidebarWidth');
    return saved ? parseInt(saved, 10) : 340;
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Resize Handlers
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const lastWidthUpdate = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeft.current && !isResizingRight.current) return;
      
      const now = performance.now();
      if (now - lastWidthUpdate.current < 16) return; // Throttle to ~60fps
      lastWidthUpdate.current = now;

      requestAnimationFrame(() => {
        if (isResizingLeft.current) {
          const newWidth = Math.max(180, Math.min(500, e.clientX));
          setLeftSidebarWidth(newWidth);
        }
        if (isResizingRight.current) {
          const newWidth = Math.max(200, Math.min(700, window.innerWidth - e.clientX));
          setRightSidebarWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (isResizingLeft.current) {
        localStorage.setItem('leftSidebarWidth', leftSidebarWidth.toString());
      }
      if (isResizingRight.current) {
        localStorage.setItem('rightSidebarWidth', rightSidebarWidth.toString());
      }
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.style.cursor = 'default';
      document.body.classList.remove('resizing', 'resizing-left', 'resizing-right');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftSidebarWidth, rightSidebarWidth]); // Update listeners when widths change to capture latest values for localStorage

  const startResizingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('resizing', 'resizing-left');
  };

  const startResizingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('resizing', 'resizing-right');
  };

  // Initial App Setup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App initialization started');
        // Give a tiny bit of time for the loading screen to be visible
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Timeout for handleTemplateSelected just in case it hangs
        const templatePromise = handleTemplateSelected('Deal_Summary_Template_1.0');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Template loading timed out')), 5000)
        );
        
        await Promise.race([templatePromise, timeoutPromise]);
        console.log('App initialization complete');
      } catch (err) {
        console.error('Initialization failed:', err);
      } finally {
        setIsAppLoading(false);
      }
    };
    initializeApp();

    // Emergency fallback: always hide loading after 8s
    const emergencyTimer = setTimeout(() => {
      setIsAppLoading(current => {
        if (current) {
          console.warn('Emergency loading fallback triggered');
          return false;
        }
        return false;
      });
    }, 8000);

    return () => clearTimeout(emergencyTimer);
  }, []);

  // Update canvas size when container or slideDimensions change
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    let isUpdating = false;

    const updateCanvasSize = () => {
      if (isUpdating || !containerRef.current || !canvasRef.current) return;
      isUpdating = true;

      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current || !canvasRef.current) {
          isUpdating = false;
          return;
        }

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) {
          isUpdating = false;
          return;
        }

        // Calculate aspect ratio from slideDimensions (EMUs)
        const aspectRatio = slideDimensions.width / slideDimensions.height;
        
        let width, height;
        if (containerWidth / containerHeight > aspectRatio) {
          // Container is wider than slide
          height = containerHeight;
          width = height * aspectRatio;
        } else {
          // Container is taller than slide
          width = containerWidth;
          height = width / aspectRatio;
        }

        // Set canvas size for high-quality rendering
        const scale = (window.devicePixelRatio || 1) * 1.5;
        const newWidth = Math.floor(width * scale);
        const newHeight = Math.floor(height * scale);

        // Only update if size actually changed to avoid unnecessary re-renders
        if (canvasRef.current.width !== newWidth || canvasRef.current.height !== newHeight) {
          canvasRef.current.width = newWidth;
          canvasRef.current.height = newHeight;
          canvasRef.current.style.width = `${Math.floor(width)}px`;
          canvasRef.current.style.height = `${Math.floor(height)}px`;

          // Re-render if viewer exists
          if (viewerRef.current && !isPreviewing) {
            viewerRef.current.render(canvasRef.current, {
              quality: 'high',
              scale: scale
            });
          }
        }
        
        isUpdating = false;
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(containerRef.current);
    
    // Initial size
    updateCanvasSize();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [slideDimensions, isPreviewing]);

  
  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [importText, setImportText] = useState('');

  const handleFetchInfo = async () => {
    if (!stockCode || stockCode.length !== 6) {
      alert('Please enter a valid 6-digit stock code.');
      return;
    }

    setIsFetchingInfo(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.fetchCompanyInfo(stockCode);
      if (result.success) {
        // Update first slide with fetched info or just set general state
        const updatedSlides = [...slides];
        if (updatedSlides.length > 0) {
          updatedSlides[0].data = {
            ...updatedSlides[0].data,
            corp_name_full: result.companyName,
            ...result.companyData
          };
          setSlides(updatedSlides);
        }
      } else {
        alert('Failed to fetch company info: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Error fetching company info: ' + err.message);
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const selectedSlide = slides.find(s => s.id === selectedSlideId);

  const handleTemplateSelected = async (templateName: string) => {
    console.log(`Selecting template: ${templateName}`);
    try {
      // @ts-ignore
      const result = await window.electronAPI.loadTemplate(templateName);
      console.log('Load template result:', result);
      
      if (result && result.success) {
        setTemplatePath(templateName);
        
        const allKeys = result.all_keys || result.keys || [];
        const structure = result.slides || [];
        const slideCount = result.slide_count || 1;
        
        setTemplateKeys(allKeys);
        setTemplateStructure(structure);
        if (result.slide_width && result.slide_height) {
          setSlideDimensions({ width: result.slide_width, height: result.slide_height });
        }
        
        // Sync slides with the template's slide count
        const syncedSlides: Slide[] = [];
        for (let i = 0; i < slideCount; i++) {
          const existingSlide = slides.find(s => s.slide_index === i);
          const slideId = existingSlide ? existingSlide.id : `slide-${i}-${Date.now()}`;
          
          const slideStructure = structure.find((s: any) => s.slide_index === i);
          const relevantKeys = slideStructure ? slideStructure.keys : allKeys;
          
          const newData: Record<string, string> = existingSlide ? { ...existingSlide.data } : {};
          relevantKeys.forEach((key: string) => {
            if (newData[key] === undefined) newData[key] = '';
          });
          
          syncedSlides.push({
            id: slideId,
            slide_index: i,
            data: newData
          });
        }
        setSlides(syncedSlides);

        // Ensure a valid slide is selected
        if (syncedSlides.length > 0) {
          const currentSlide = syncedSlides.find(s => s.id === selectedSlideId);
          if (!currentSlide) {
            setSelectedSlideId(syncedSlides[0].id);
          }
        }
        
        setShowTemplateModal(false);
      }
    } catch (err: any) {
      console.error('Failed to load template:', err);
      // Only alert if it's not the initial load or if it's a real error
      if (templateName !== 'template_ppt.pptx' || err.message?.includes('not found')) {
        alert(`Failed to load template: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const getRelevantKeysForSlide = (slideIndex: number) => {
    // If we have structure for this specific index, use it
    if (templateStructure && templateStructure.length > 0) {
      const struct = templateStructure.find(s => s.slide_index === slideIndex);
      if (struct && struct.keys.length > 0) return struct.keys;
    }
    
    // Fallback: If no specific keys for this slide index, but we have global keys,
    // it might be a newly added slide or a simple template.
    // We show all keys to allow the user to fill them in.
    return templateKeys;
  };

  const getRelevantElementsForSlide = (slideIndex: number) => {
    if (templateStructure && templateStructure.length > 0) {
      const struct = templateStructure.find(s => s.slide_index === slideIndex);
      return struct ? struct.elements : [];
    }
    return [];
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

  const updateSlideData = (key: string, value: string) => {
    setSlides(slides.map(s => 
      s.id === selectedSlideId ? { ...s, data: { ...s.data, [key]: value } } : s
    ));
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

  const generatePreview = useCallback(async () => {
    if (!canvasRef.current || slides.length === 0) return;
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const payload = {
        json_version: "1.0.0",
        template: templatePath,
        slides: slides.map(s => ({ slide_index: s.slide_index, ...s.data }))
      };
      
      // @ts-ignore
      const result = await window.electronAPI.generatePreview(payload);
      
      if (result.success && result.buffer) {
        // Clear previous viewer if it exists to ensure fresh start
        if (viewerRef.current) {
          try {
            viewerRef.current.destroy();
          } catch (e) {
            console.warn("Error destroying viewer", e);
          }
          viewerRef.current = null;
        }

        viewerRef.current = new (PPTXViewer as any)({ 
          canvas: canvasRef.current,
          debug: false,
          backgroundColor: 'white',
          slideSizeMode: 'fit'
        });
        
        // Handle various buffer formats from Electron IPC
        let arrayBuffer;
        if (result.buffer instanceof ArrayBuffer) {
          arrayBuffer = result.buffer;
        } else if (result.buffer instanceof Uint8Array) {
          arrayBuffer = result.buffer.buffer;
        } else if (result.buffer && result.buffer.type === 'Buffer' && Array.isArray(result.buffer.data)) {
          arrayBuffer = new Uint8Array(result.buffer.data).buffer;
        } else {
          // Fallback for Buffer-like objects
          arrayBuffer = new Uint8Array(Object.values(result.buffer)).buffer;
        }
        
        await viewerRef.current.loadFile(arrayBuffer);
        
        const renderOptions = {
          quality: 'high',
          scale: (window.devicePixelRatio || 1) * 1.5 // Extra boost for fidelity
        };

        if (selectedSlide) {
          try {
            await viewerRef.current.renderSlide(selectedSlide.slide_index, canvasRef.current, renderOptions);
          } catch (e) {
            console.warn("Could not go to slide", selectedSlide.slide_index, e);
          }
        } else {
          await viewerRef.current.render(canvasRef.current, renderOptions);
        }
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      setPreviewError(err.message || 'Failed to generate preview');
    } finally {
      setIsPreviewing(false);
    }
  }, [slides, templatePath, selectedSlide]);



  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [generatePreview]);

  return (
    <>
      {/* App-wide Loading Screen */}
      {isAppLoading && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center animate-pulse">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -inset-2 border-2 border-primary/20 border-t-primary rounded-[2rem] animate-spin [animation-duration:1.5s]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">PPT Forger</h1>
          <p className="text-slate-400 text-sm font-medium animate-pulse">Initializing Rendering Engine...</p>
          
          <div className="mt-12 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
          
          <style>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(250%); }
            }
          `}</style>
        </div>
      )}

      <div className={`flex h-screen w-full bg-background text-foreground select-none overflow-hidden transition-opacity duration-700 ${isAppLoading ? 'opacity-0' : 'opacity-100'}`}>
      
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
              className="w-full h-64 border border-slate-200 rounded-xl p-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white resize-none"
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
      <aside 
        className="border-r border-border bg-white flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 shrink-0 relative"
        style={{ width: `${leftSidebarWidth}px` }}
      >
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
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${selectedSlideId === slide.id ? 'text-primary' : 'text-slate-700'}`}>
                  Page {idx + 1}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedSlideId === slide.id ? 'rotate-90 text-primary' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-slate-50/50 shrink-0">
          <button className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all border border-transparent hover:border-slate-200">
            <Settings className="w-4 h-4 text-slate-400" />
            Settings
          </button>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizingLeft}
          className="resizer-hit-area right-0"
        >
          <div className="resizer-handle right-0 left-resizer" />
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
        <main className="flex-1 flex overflow-hidden min-w-0">
          
          {/* Canvas Preview */}
          <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-start relative min-h-0 min-w-0">
            <div className="w-full flex justify-between items-end mb-3 z-10 shrink-0">
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

            {/* Dynamic Abstract Preview Wrapper */}
            <div 
              className="flex-1 w-full bg-white rounded-xl shadow-2xl shadow-slate-200/60 border border-slate-200 overflow-hidden relative group flex flex-col z-0 transition-all duration-500 ring-1 ring-black/5 min-h-0"
            >
              <div className="h-10 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-400/20 border border-red-400/30" />
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-400/20 border border-amber-400/30" />
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/20 border border-emerald-400/30" />
                 </div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   {isPreviewing ? (
                     <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                   ) : (
                     <button 
                       onClick={() => generatePreview()}
                       className="flex items-center gap-1 hover:text-primary transition-colors"
                       title="Force Refresh Preview"
                     >
                       <RefreshCw className="w-2.5 h-2.5" />
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       High Fidelity Preview
                     </button>
                   )}
                 </div>
              </div>

              <div 
                ref={containerRef}
                className="flex-1 p-0 flex items-center justify-center relative bg-slate-200/30 overflow-hidden w-full h-full"
              >
                {previewError ? (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Preview Generation Failed</h3>
                    <p className="text-sm text-slate-500 max-w-md">{previewError}</p>
                    <button 
                      onClick={() => generatePreview()}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <canvas 
                    ref={canvasRef} 
                    className="shadow-2xl bg-white"
                  />
                )}
                
                {!selectedSlide && !previewError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm text-slate-400 font-medium animate-pulse">
                    Select a slide from the navigator to preview actual layout
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div 
            className="border-l border-border bg-white flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.02)] z-10 shrink-0 relative overflow-hidden min-w-0"
            style={{ width: `${rightSidebarWidth}px` }}
          >
            {/* Resizer Handle */}
            <div 
              onMouseDown={startResizingRight}
              className="resizer-hit-area left-0"
            >
              <div className="resizer-handle left-0 right-resizer" />
            </div>


            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-white shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <LayoutTemplate className="w-4.5 h-4.5 text-primary" />
                Slide Data
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Stock Code Fetcher */}
              <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Stock Data Sync</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                    placeholder="Stock Code (005930)"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <button
                    onClick={handleFetchInfo}
                    disabled={isFetchingInfo || stockCode.length !== 6}
                    className="bg-primary text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isFetchingInfo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {selectedSlide ? (
                <div className="space-y-6">
                  {/* Ensure all templateKeys and relevant keys for this slide are rendered */}
                  {Array.from(new Set([...getRelevantKeysForSlide(selectedSlide.slide_index), ...Object.keys(selectedSlide.data)])).map((key) => (
                    <div key={key} className="space-y-2 group/field">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        {key}
                        {getRelevantKeysForSlide(selectedSlide.slide_index).includes(key) && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Template</span>
                        )}
                      </label>
                      <textarea
                        value={selectedSlide.data[key] || ''}
                        onChange={(e) => updateSlideData(key, e.target.value)}
                        placeholder={`Enter ${key}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-y min-h-[100px] shadow-sm shadow-slate-100/50 leading-relaxed"
                      />
                    </div>
                  ))}
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
    </>
  );
};


export default App;
