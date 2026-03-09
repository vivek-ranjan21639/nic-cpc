import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { DropdownItem } from "@/lib/nicUtils";

interface LevelDropdownProps {
  levelName: string;
  items: DropdownItem[];
  selectedCodes: string[];
  onSelect: (codes: string[]) => void;
  multiSelect?: boolean;
  levelIndex?: number;
  totalLevels?: number;
}

const LevelDropdown = ({ levelName, items, selectedCodes, onSelect, multiSelect = false, levelIndex = 0, totalLevels = 5 }: LevelDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItems = items.filter((i) => selectedCodes.includes(i.code));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleItemClick = (code: string) => {
    if (multiSelect) {
      const newCodes = selectedCodes.includes(code)
        ? selectedCodes.filter((c) => c !== code)
        : [...selectedCodes, code];
      onSelect(newCodes);
    } else {
      onSelect([code]);
      setOpen(false);
      setSearch("");
    }
  };

  const displayLabel = () => {
    if (selectedItems.length === 0) return levelName;
    if (selectedItems.length === 1) return `${selectedItems[0].code} – ${selectedItems[0].title}`;
    return `${selectedItems.length} selected`;
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setOpen(!open); setSearch(""); }}
          className={`flex-1 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            selectedCodes.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          } ${selectedCodes.length > 0 ? "rounded-r-none" : ""}`}
        >
          <span className="text-left break-words line-clamp-2 leading-tight">
            {displayLabel()}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {selectedCodes.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect([]); }}
            className="rounded-md rounded-l-none bg-primary/80 text-primary-foreground px-1.5 py-2 hover:bg-destructive transition-colors"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (() => {
        const rect = ref.current?.getBoundingClientRect();
        const top = (rect?.bottom ?? 0) + 4;
        const isFirst = levelIndex === 0;
        const isLast = levelIndex === totalLevels - 1;
        const isMobile = window.innerWidth < 768;
        let left: number;
        if (isMobile) {
          left = Math.max(8, (window.innerWidth - 320) / 2);
        } else if (isFirst) {
          left = rect?.left ?? 8;
        } else if (isLast) {
          left = (rect?.right ?? 320) - 320;
        } else {
          const center = (rect?.left ?? 0) + (rect?.width ?? 0) / 2;
          left = Math.min(Math.max(8, center - 160), window.innerWidth - 328);
        }
        return (
        <div className="fixed z-50 w-80 rounded-lg border border-border bg-popover shadow-xl" style={{ top, left }}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${levelName.toLowerCase()}…`}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            {multiSelect && selectedCodes.length > 0 && (
              <button
                onClick={() => onSelect([])}
                className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No results found</p>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedCodes.includes(item.code);
                return (
                  <button
                    key={item.code}
                    onClick={() => handleItemClick(item.code)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-popover-foreground hover:bg-accent/15"
                    }`}
                  >
                    {multiSelect && (
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "border-primary-foreground bg-primary-foreground/20"
                          : "border-muted-foreground"
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    )}
                    <span>
                      <span className="font-mono font-semibold">{item.code}</span>
                      <span className="ml-2">{item.title}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default LevelDropdown;
