import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const CAL_W = 252;
const CAL_H = 310;

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = '날짜 선택', required, disabled, className = '', compact }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? new Date().getMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (open && selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = r.bottom + 4;
    let left = r.left;

    if (top + CAL_H > vh) top = r.top - CAL_H - 4;
    if (left + CAL_W > vw) left = vw - CAL_W - 8;
    if (left < 4) left = 4;
    if (top < 4) top = 4;

    setPos({ top, left });
  }, [open, viewMonth, viewYear]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();
  const today = fmt(new Date());
  const rows = Math.ceil((firstDay + daysInMonth) / 7);

  const cells: { day: number; current: boolean; dateStr: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}` });
  }
  const total = rows * 7;
  for (let d = 1; cells.length < total; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
  }

  function selectDate(dateStr: string) {
    onChange(dateStr);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  const displayValue = selected
    ? `${selected.getFullYear()}.${pad(selected.getMonth() + 1)}.${pad(selected.getDate())}`
    : '';

  const dropdown = open && createPortal(
    <div
      ref={popRef}
      className="fixed z-[9999] bg-white rounded-lg border border-slate-200 shadow-xl p-2.5"
      style={{ top: pos.top, left: pos.left, width: CAL_W }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1.5">
        <button type="button" onClick={prevMonth}
          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-0.5 text-xs font-semibold text-slate-800">
          <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-transparent cursor-pointer hover:text-[#0066cc] border-none outline-none appearance-none text-center">
            {Array.from({ length: 11 }, (_, i) => viewYear - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span>{MONTHS[viewMonth]}</span>
        </div>
        <button type="button" onClick={nextMonth}
          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-medium py-0.5
            ${i === 0 ? 'text-[#dc3545]' : i === 6 ? 'text-[#0066cc]' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isSelected = cell.dateStr === value;
          const isToday = cell.dateStr === today;
          const dow = i % 7;

          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDate(cell.dateStr)}
              className={`h-7 rounded text-[11px] font-medium transition
                ${!cell.current ? 'text-slate-300' : ''}
                ${cell.current && dow === 0 ? 'text-[#dc3545]/70' : ''}
                ${cell.current && dow === 6 ? 'text-[#0066cc]/70' : ''}
                ${cell.current && dow > 0 && dow < 6 ? 'text-slate-700' : ''}
                ${isSelected ? 'bg-[#0066cc] !text-white shadow-sm' : 'hover:bg-slate-100'}
                ${isToday && !isSelected ? 'ring-1 ring-[#0066cc] ring-inset font-bold' : ''}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
        <button type="button"
          onClick={() => { onChange(fmt(new Date())); setOpen(false); }}
          className="text-[11px] text-[#0066cc] hover:underline font-medium">
          오늘
        </button>
        {value && (
          <button type="button" onClick={handleClear}
            className="text-[11px] text-slate-400 hover:text-slate-600">
            초기화
          </button>
        )}
      </div>
    </div>,
    document.body,
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full flex items-center gap-1.5 border rounded-md text-sm transition
          ${open ? 'border-[#0066cc] ring-2 ring-[#0066cc]/20' : 'border-slate-300 hover:border-slate-400'}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900 cursor-pointer'}
          ${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-[7px]'}`}
      >
        <Calendar size={compact ? 12 : 14} className={`shrink-0 ${displayValue ? 'text-[#0066cc]' : 'text-slate-400'}`} />
        <span className={`flex-1 text-left truncate ${!displayValue ? 'text-slate-400' : ''}`}>
          {displayValue || placeholder}
        </span>
        {value && !disabled && !required && (
          <span onClick={handleClear} className="text-slate-400 hover:text-slate-600 text-[10px] leading-none">✕</span>
        )}
      </button>
      {dropdown}
    </div>
  );
}
