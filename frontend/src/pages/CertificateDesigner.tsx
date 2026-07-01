import React, { useState, useRef } from 'react';
import { Type, Calendar, ShieldCheck, Award, Save, RefreshCw, PenTool, LayoutGrid } from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'STUDENT_NAME' | 'COURSE_TITLE' | 'DATE' | 'VERIFY_CODE' | 'SIGNATURE' | 'STATIC_TEXT';
  label: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export const CertificateDesigner: React.FC = () => {
  // Canvas settings
  const [template, setTemplate] = useState<'classic' | 'modern' | 'minimalist'>('classic');
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: '1', type: 'STUDENT_NAME', label: 'Student Name', text: 'John Doe', x: 280, y: 240, fontSize: 32, color: '#f59e0b', fontWeight: 'bold' },
    { id: '2', type: 'COURSE_TITLE', label: 'Course Title', text: 'Full Stack Web Development', x: 220, y: 310, fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    { id: '3', type: 'DATE', label: 'Issue Date', text: 'July 1, 2026', x: 180, y: 440, fontSize: 14, color: '#94a3b8', fontWeight: 'normal' },
    { id: '4', type: 'VERIFY_CODE', label: 'Verification Code', text: 'ID: KTC-8F9A-4B2C', x: 450, y: 440, fontSize: 12, color: '#64748b', fontWeight: 'normal' },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Drag offsets
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const templates = {
    classic: {
      border: 'border-[16px] border-amber-500/20',
      background: 'bg-slate-950',
      header: 'text-amber-500 font-serif',
      subtitle: 'text-amber-200/50'
    },
    modern: {
      border: 'border-[16px] border-cyan-500/20',
      background: 'bg-[#050811]',
      header: 'text-cyan-400 font-sans',
      subtitle: 'text-cyan-200/50'
    },
    minimalist: {
      border: 'border-[8px] border-slate-700',
      background: 'bg-slate-900',
      header: 'text-white font-mono',
      subtitle: 'text-slate-400'
    }
  };

  // Add new static text element
  const addStaticText = () => {
    const newEl: CanvasElement = {
      id: Date.now().toString(),
      type: 'STATIC_TEXT',
      label: 'Static Text',
      text: 'Double click to edit text',
      x: 300,
      y: 180,
      fontSize: 16,
      color: '#ffffff',
      fontWeight: 'normal'
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  // HTML5 Drag and Drop from sidebar
  const handleSidebarDragStart = (e: React.DragEvent, type: CanvasElement['type'], label: string) => {
    e.dataTransfer.setData('elType', type);
    e.dataTransfer.setData('elLabel', label);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const elType = e.dataTransfer.getData('elType') as CanvasElement['type'];
    const elLabel = e.dataTransfer.getData('elLabel');
    if (!elType) return;

    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasBounds.left - 100; // Offset approx width center
    const y = e.clientY - canvasBounds.top - 15;

    // Check if element of same type (except static text) already exists
    if (elType !== 'STATIC_TEXT' && elements.some(el => el.type === elType)) {
      alert(`The ${elLabel} placeholder is already on the canvas.`);
      return;
    }

    const newEl: CanvasElement = {
      id: Date.now().toString(),
      type: elType,
      label: elLabel,
      text: elType === 'SIGNATURE' ? 'Trainer Signature' : `[${elLabel}]`,
      x: Math.max(0, Math.min(x, 600)),
      y: Math.max(0, Math.min(y, 450)),
      fontSize: elType === 'SIGNATURE' ? 18 : 16,
      color: '#ffffff',
      fontWeight: 'normal'
    };

    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  // Dragging elements inside the canvas
  const handleElementDragStart = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setDraggingId(el.id);
    dragOffset.current = {
      x: e.clientX - el.x,
      y: e.clientY - el.y
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;

    const canvasBounds = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - dragOffset.current.x;
    let y = e.clientY - dragOffset.current.y;

    // Keep within bounds
    x = Math.max(0, Math.min(x, canvasBounds.width - 150));
    y = Math.max(0, Math.min(y, canvasBounds.height - 40));

    setElements(prev =>
      prev.map(el => (el.id === draggingId ? { ...el, x, y } : el))
    );
  };

  const stopDragging = () => {
    setDraggingId(null);
  };

  const updateSelectedElement = (key: keyof CanvasElement, val: any) => {
    if (!selectedId) return;
    setElements(prev =>
      prev.map(el => (el.id === selectedId ? { ...el, [key]: val } : el))
    );
  };

  const deleteSelectedElement = () => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const saveLayout = async () => {
    setSaving(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Certificate template layout saved successfully!');
  };

  const selectedEl = elements.find(el => el.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Certificate Layout Designer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Drag templates, reposition certificate variables, and customize fonts and colors visually.
          </p>
        </div>
        <button
          onClick={saveLayout}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] disabled:opacity-50 transition-all"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'SAVING LAYOUT...' : 'SAVE TEMPLATE'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: Components & Themes */}
        <div className="space-y-6 xl:col-span-1">
          {/* Themes Panel */}
          <div className="p-5 glow-card rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-brand" />
              <span>Canvas Border Style</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['classic', 'modern', 'minimalist'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    template === t
                      ? 'bg-brand/10 border-brand text-brand'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholders Panel */}
          <div className="p-5 glow-card rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PenTool className="w-4 h-4 text-brand" />
              <span>Drag Placeholders</span>
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                { type: 'STUDENT_NAME', label: 'Student Name', icon: Type },
                { type: 'COURSE_TITLE', label: 'Course Title', icon: Award },
                { type: 'DATE', label: 'Issue Date', icon: Calendar },
                { type: 'VERIFY_CODE', label: 'Verify Code', icon: ShieldCheck },
                { type: 'SIGNATURE', label: 'Signature Line', icon: Type }
              ].map(item => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => handleSidebarDragStart(e, item.type as CanvasElement['type'], item.label)}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl cursor-grab active:cursor-grabbing flex items-center space-x-3 text-xs text-slate-300 font-semibold transition-all"
                >
                  <item.icon className="w-4 h-4 text-brand" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={addStaticText}
              className="w-full mt-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all"
            >
              Add Static Custom Text
            </button>
          </div>
        </div>

        {/* Center: Canvas Workspace */}
        <div className="xl:col-span-2 flex flex-col items-center">
          <div
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDrop={handleCanvasDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            className={`w-[800px] h-[550px] relative rounded-2xl shadow-2xl transition-all overflow-hidden ${templates[template].border} ${templates[template].background}`}
          >
            {/* Template Graphics */}
            <div className="absolute inset-0 flex flex-col items-center justify-between p-12 pointer-events-none">
              <div className="text-center space-y-2 mt-4">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em]">Official Certification</span>
                <h2 className={`text-3xl font-bold uppercase tracking-widest ${templates[template].header}`}>
                  KODE TO CAREER
                </h2>
                <div className={`text-xs ${templates[template].subtitle}`}>
                  This is to certify that the candidate has successfully completed
                </div>
              </div>
              <div className="text-center mb-6">
                <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mx-auto"></div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono uppercase">
                  Verify validity at kodetocareer.com/verify
                </div>
              </div>
            </div>

            {/* Draggable Elements Overlay */}
            {elements.map(el => {
              const isSelected = selectedId === el.id;
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementDragStart(e, el)}
                  style={{
                    left: el.x,
                    top: el.y,
                    fontSize: `${el.fontSize}px`,
                    color: el.color,
                    fontWeight: el.fontWeight,
                  }}
                  className={`absolute px-2.5 py-1 rounded cursor-move select-none transition-all ${
                    isSelected ? 'ring-2 ring-brand bg-brand/10' : 'hover:bg-white/5'
                  }`}
                >
                  {el.type === 'STATIC_TEXT' ? (
                    <input
                      type="text"
                      value={el.text}
                      onChange={(e) => updateSelectedElement('text', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()} // Prevent dragging while typing
                      className="bg-transparent border-none text-center outline-none focus:ring-0 w-48 text-xs font-semibold"
                    />
                  ) : (
                    <span>{el.text}</span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-[10px] text-slate-500 mt-3 font-semibold uppercase tracking-wider">
            Workspace: 800px × 550px | Click elements to configure styles | Drag placeholders from sidebar
          </span>
        </div>

        {/* Right Sidebar: Element Style Config */}
        <div className="xl:col-span-1">
          {selectedEl ? (
            <div className="p-5 glow-card rounded-2xl border border-white/5 bg-slate-950/40 space-y-5 animate-in slide-in-from-right duration-150">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configure Element</h4>
                <button
                  onClick={deleteSelectedElement}
                  className="text-xs text-red-400 hover:text-red-300 font-bold uppercase"
                >
                  Remove
                </button>
              </div>

              {/* Text Style Controls */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Label / Type</label>
                  <input
                    type="text"
                    value={selectedEl.label}
                    disabled
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-slate-500 text-xs disabled:cursor-not-allowed"
                  />
                </div>

                {selectedEl.type !== 'STATIC_TEXT' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Preview Text</label>
                    <input
                      type="text"
                      value={selectedEl.text}
                      onChange={(e) => updateSelectedElement('text', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Font Size (px)</label>
                    <input
                      type="number"
                      value={selectedEl.fontSize}
                      onChange={(e) => updateSelectedElement('fontSize', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Font Weight</label>
                    <select
                      value={selectedEl.fontWeight}
                      onChange={(e) => updateSelectedElement('fontWeight', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none text-xs bg-slate-900"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Text Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedEl.color}
                      onChange={(e) => updateSelectedElement('color', e.target.value)}
                      className="w-10 h-8 rounded bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedEl.color}
                      onChange={(e) => updateSelectedElement('color', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Position X</span>
                    <span className="font-mono text-xs text-white font-semibold">{selectedEl.x}px</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Position Y</span>
                    <span className="font-mono text-xs text-white font-semibold">{selectedEl.y}px</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 glow-card rounded-2xl border border-white/5 bg-slate-950/40 text-center text-slate-500 text-xs py-8">
              Click an element on the canvas to configure its styles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
