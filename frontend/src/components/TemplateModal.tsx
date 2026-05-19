import React, { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateName: string) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [templates, setTemplates] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // @ts-ignore
      window.electronAPI.listTemplates().then((files: string[]) => {
        setTemplates(files);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] max-w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Select Template</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No templates found in /public/templates/</p>
          ) : (
            templates.map((name) => (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 border border-transparent hover:border-slate-200"
              >
                <FileText className="w-4 h-4 text-primary" />
                {name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
