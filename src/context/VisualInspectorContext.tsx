import React, { createContext, useContext, useState, useEffect } from 'react';

interface VisualInspectorContextType {
  isInspectorActive: boolean;
  toggleInspector: () => void;
  setInspectorActive: (active: boolean) => void;
}

const VisualInspectorContext = createContext<VisualInspectorContextType | undefined>(undefined);

export const VisualInspectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('prodx_visual_inspector') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('prodx_visual_inspector', String(isInspectorActive));
    } catch {}

    if (isInspectorActive) {
      document.body.classList.add('prodx-visual-inspector-active');
    } else {
      document.body.classList.remove('prodx-visual-inspector-active');
    }
  }, [isInspectorActive]);

  const toggleInspector = () => setIsInspectorActive((prev) => !prev);
  const setInspectorActive = (active: boolean) => setIsInspectorActive(active);

  return (
    <VisualInspectorContext.Provider value={{ isInspectorActive, toggleInspector, setInspectorActive }}>
      {children}
      {isInspectorActive && (
        <div className="fixed bottom-3 right-3 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-xl shadow-2xl border border-destructive-foreground/30 flex items-center gap-3 font-mono text-xs animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
          <span className="font-bold">VISUAL INSPECTOR ACTIVE</span>
          <span className="text-[10px] opacity-80">(1px dashed flex/absolute/relative outlines)</span>
          <button
            type="button"
            onClick={() => setIsInspectorActive(false)}
            className="ml-2 bg-background/20 hover:bg-background/40 px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors"
          >
            Turn Off
          </button>
        </div>
      )}
    </VisualInspectorContext.Provider>
  );
};

export const useVisualInspector = () => {
  const context = useContext(VisualInspectorContext);
  if (!context) {
    throw new Error('useVisualInspector must be used within a VisualInspectorProvider');
  }
  return context;
};
