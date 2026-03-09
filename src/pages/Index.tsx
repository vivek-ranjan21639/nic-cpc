import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/logo.webp";
import LevelDropdown from "@/components/LevelDropdown";
import { nicHierarchy } from "@/data/nicHierarchy";
import { cpcHierarchy } from "@/data/cpcHierarchy";
import {
  getChildrenFromTree,
  getAncestorPath,
  searchIndex,
  getPathFromIndex,
  flattenHierarchy,
  LEVEL_NAMES,
  FlatRow,
  searchAllLevels,
  CrossLevelResult,
} from "@/lib/nicUtils";
import {
  getCPCChildrenFromTree,
  getCPCAncestorPath,
  searchCPCIndex,
  getCPCPathFromIndex,
  flattenCPCHierarchy,
  CPC_LEVEL_NAMES,
  CPCFlatRow,
  searchAllCPCLevels,
} from "@/lib/cpcUtils";
import { Search, X, Download } from "lucide-react";

const LEVELS = [0, 1, 2, 3, 4];
const FILTER_KEYS: (keyof FlatRow)[] = ["section", "division", "group", "class", "sub_class"];
const CPC_FILTER_KEYS: (keyof CPCFlatRow)[] = ["section", "division", "group", "class", "sub_class"];

const EMPTY_PATH: string[][] = [[], [], [], [], []];

const Index = () => {
  const [nicPath, setNicPath] = useState<string[][]>([[], [], [], [], []]);
  const [cpcPath, setCpcPath] = useState<string[][]>([[], [], [], [], []]);
  const [nicMultiSelect, setNicMultiSelect] = useState(false);
  const [cpcMultiSelect, setCpcMultiSelect] = useState(false);
  const [activeToggle, setActiveToggle] = useState<"NIC" | "CPC">("NIC");
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const selectedPath = activeToggle === "NIC" ? nicPath : cpcPath;
  const setSelectedPath = activeToggle === "NIC" ? setNicPath : setCpcPath;
  const multiSelect = activeToggle === "NIC" ? nicMultiSelect : cpcMultiSelect;
  const setMultiSelect = activeToggle === "NIC" ? setNicMultiSelect : setCpcMultiSelect;

  const allNicRows = useMemo(() => flattenHierarchy(nicHierarchy), []);
  const allCpcRows = useMemo(() => flattenCPCHierarchy(cpcHierarchy), []);

  const allRows = activeToggle === "NIC" ? allNicRows : allCpcRows;
  const filterKeys = activeToggle === "NIC" ? FILTER_KEYS : CPC_FILTER_KEYS;

  const filteredRows = useMemo(() => {
    return allRows.filter((row: any) => {
      for (let i = 0; i < filterKeys.length; i++) {
        const selected = selectedPath[i];
        if (selected.length > 0 && !selected.includes(row[filterKeys[i]])) return false;
      }
      return true;
    });
  }, [allRows, selectedPath, filterKeys]);

  const crossLevelSearch = useMemo(() => {
    if (activeToggle === "NIC") return searchAllLevels(nicHierarchy, globalSearch);
    return searchAllCPCLevels(cpcHierarchy, globalSearch);
  }, [activeToggle, globalSearch]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, CrossLevelResult[]> = {};
    for (const r of crossLevelSearch.results) {
      if (!groups[r.level]) groups[r.level] = [];
      groups[r.level].push(r);
    }
    return groups;
  }, [crossLevelSearch.results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Convert string[][] path to (string | null)[] for tree lookup (use first selected or null)
  const pathForTree = useMemo(() => {
    return selectedPath.map((codes) => (codes.length === 1 ? codes[0] : null));
  }, [selectedPath]);

  const handleSelect = useCallback((levelIndex: number, codes: string[]) => {
    const setter = activeToggle === "NIC" ? setNicPath : setCpcPath;
    const isMulti = activeToggle === "NIC" ? nicMultiSelect : cpcMultiSelect;

    if (isMulti) {
      // In multi-select, just update this level, don't auto-fill parents or clear children
      setter((prev) => {
        const next = [...prev];
        next[levelIndex] = codes;
        return next;
      });
    } else {
      // Single select: auto-fill ancestors and clear children
      if (codes.length === 0) {
        setter((prev) => {
          const next = [...prev];
          next[levelIndex] = [];
          for (let i = levelIndex + 1; i < next.length; i++) next[i] = [];
          return next;
        });
        return;
      }
      const code = codes[0];
      const tree = activeToggle === "NIC" ? nicHierarchy : cpcHierarchy;
      const ancestorPath = activeToggle === "NIC"
        ? getAncestorPath(tree as any, code)
        : getCPCAncestorPath(cpcHierarchy, code);
      setter((prev) => {
        const next = [...prev];
        for (let i = 0; i <= levelIndex; i++) {
          next[i] = ancestorPath[i] ? [ancestorPath[i]!] : [];
        }
        for (let i = levelIndex + 1; i < next.length; i++) next[i] = [];
        return next;
      });
    }
  }, [activeToggle, nicMultiSelect, cpcMultiSelect]);

  const handleSearchResultClick = (result: CrossLevelResult) => {
    const tree = activeToggle === "NIC" ? nicHierarchy : cpcHierarchy;
    const ancestorPath = activeToggle === "NIC"
      ? getAncestorPath(tree as any, result.code)
      : getCPCAncestorPath(cpcHierarchy, result.code);
    // Fill up to the result's level
    setSelectedPath((prev) => {
      const next = [...prev];
      for (let i = 0; i <= result.levelIndex; i++) {
        next[i] = ancestorPath[i] ? [ancestorPath[i]!] : [];
      }
      for (let i = result.levelIndex + 1; i < next.length; i++) next[i] = [];
      return next;
    });
    setGlobalSearch("");
    setSearchOpen(false);
  };

  const handleDidYouMean = (suggestion: string) => {
    setGlobalSearch(suggestion);
    setSearchOpen(true);
  };

  const handleToggle = (toggle: "NIC" | "CPC") => {
    setActiveToggle(toggle);
    setGlobalSearch("");
  };

  const handleMultiSelectToggle = () => {
    // When toggling off multi-select, clear all filters
    if (multiSelect) {
      setSelectedPath([[], [], [], [], []]);
    }
    setMultiSelect(!multiSelect);
  };

  const clearFilters = () => setSelectedPath([[], [], [], [], []]);
  const hasFilters = selectedPath.some((codes) => codes.length > 0);

  const levelNames = activeToggle === "NIC" ? LEVEL_NAMES : CPC_LEVEL_NAMES;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" role="application" aria-label={`${activeToggle} Code Browser`}>
      <Helmet>
        <title>{activeToggle === "NIC" ? "NIC Code Browser" : "CPC Code Browser"} | Data for Development</title>
        <meta name="description" content={`Browse and search ${activeToggle === "NIC" ? "National Industrial Classification (NIC)" : "Central Product Classification (CPC)"} codes across all hierarchy levels.`} />
      </Helmet>
      <header className="border-b border-border bg-gradient-to-r from-[hsl(var(--header-gradient-from))] to-[hsl(var(--header-gradient-to))] shrink-0 shadow-md" role="banner">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Data for Development" className="h-20 w-auto object-contain drop-shadow-md" />
            <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center rounded-full bg-white/15 backdrop-blur-sm p-1" aria-label="Classification type">
              <button
                onClick={() => handleToggle("NIC")}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-all ${
                  activeToggle === "NIC"
                    ? "bg-white text-[hsl(var(--header-gradient-from))] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                NIC 2025
              </button>
              <button
                onClick={() => handleToggle("CPC")}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-all ${
                  activeToggle === "CPC"
                    ? "bg-white text-[hsl(var(--header-gradient-from))] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                CPC_3.0_Draft
              </button>
            </nav>
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex items-center rounded-full bg-white/15 backdrop-blur-sm p-1">
                <button
                  onClick={() => handleToggle("NIC")}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                    activeToggle === "NIC"
                      ? "bg-white text-[hsl(var(--header-gradient-from))] shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  NIC 2025
                </button>
                <button
                  onClick={() => handleToggle("CPC")}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                    activeToggle === "CPC"
                      ? "bg-white text-[hsl(var(--header-gradient-from))] shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  CPC_3.0_Draft
                </button>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <search ref={searchRef} className="relative w-80" role="search" aria-label="Search classification codes">
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => { setGlobalSearch(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search using keyword"
                  className="w-full rounded-lg border border-white/20 bg-white/15 backdrop-blur-sm px-4 py-2.5 pl-10 text-sm text-white shadow-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                {searchOpen && (crossLevelSearch.results.length > 0 || crossLevelSearch.suggestion) && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                    {crossLevelSearch.suggestion && (
                      <button
                        onClick={() => handleDidYouMean(crossLevelSearch.suggestion!)}
                        className="w-full px-4 py-2.5 text-left text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-b border-border hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                      >
                        ⚠️ Did you mean: <span className="font-semibold underline">{crossLevelSearch.suggestion}</span>?
                      </button>
                    )}
                    {Object.entries(groupedResults).map(([level, items]) => (
                      <div key={level}>
                        <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">{level}s</div>
                        {items.slice(0, 10).map((r) => (
                          <button
                            key={`${r.level}-${r.code}`}
                            onClick={() => handleSearchResultClick(r)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0"
                          >
                            <span className="font-mono font-semibold text-foreground">{r.code}</span>
                            <span className="ml-2 text-foreground">{r.title}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({r.level})</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </search>
              <div className="flex items-center gap-1.5">
                <a
                  href={activeToggle === "NIC" ? "/downloads/NIC_2025.pdf" : "/downloads/CPC_v3.0.pdf"}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition-colors"
                  title={`Download ${activeToggle} PDF`}
                >
                  <Download className="h-4 w-4" /> PDF
                </a>
                <a
                  href={activeToggle === "NIC" ? "/downloads/NIC_2025.xlsx" : "/downloads/CPC_v3.0.xlsx"}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition-colors"
                  title={`Download ${activeToggle} Excel`}
                >
                  <Download className="h-4 w-4" /> Excel
                </a>
              </div>
            </div>
          </div>
          {/* Search bar below on tablet/phone */}
          <div className="mt-4 lg:hidden space-y-3">
            <div className="relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search using keyword"
                className="w-full rounded-lg border border-white/20 bg-white/15 backdrop-blur-sm px-4 py-2.5 pl-10 text-sm text-white shadow-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              {searchOpen && (crossLevelSearch.results.length > 0 || crossLevelSearch.suggestion) && (
                <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  {crossLevelSearch.suggestion && (
                    <button
                      onClick={() => handleDidYouMean(crossLevelSearch.suggestion!)}
                      className="w-full px-4 py-2.5 text-left text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-b border-border hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      ⚠️ Did you mean: <span className="font-semibold underline">{crossLevelSearch.suggestion}</span>?
                    </button>
                  )}
                  {Object.entries(groupedResults).map(([level, items]) => (
                    <div key={level}>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">{level}s</div>
                      {items.slice(0, 10).map((r) => (
                        <button
                          key={`${r.level}-${r.code}`}
                          onClick={() => handleSearchResultClick(r)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0"
                        >
                          <span className="font-mono font-semibold text-foreground">{r.code}</span>
                          <span className="ml-2 text-foreground">{r.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({r.level})</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeToggle === "NIC" ? "/downloads/NIC_2025.pdf" : "/downloads/CPC_v3.0.pdf"}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 transition-colors"
              >
                <Download className="h-4 w-4" /> PDF
              </a>
              <a
                href={activeToggle === "NIC" ? "/downloads/NIC_2025.xlsx" : "/downloads/CPC_v3.0.xlsx"}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 transition-colors"
              >
                <Download className="h-4 w-4" /> Excel
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Data Table */}
      <main className="flex-1 flex flex-col overflow-hidden container mx-auto px-6 py-4 w-full" role="main" aria-label={`${activeToggle} classification data table`}>
        <div className="mb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {hasFilters && (
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> of {allRows.length} records
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMultiSelectToggle}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all border shadow-sm ${
                multiSelect
                  ? "bg-accent text-accent-foreground border-accent ring-2 ring-accent/30"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40 hover:shadow-md"
              }`}
            >
              Multi-select {multiSelect ? "ON" : "OFF"}
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden flex flex-col flex-1 min-h-0 shadow-md bg-card">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-fixed text-sm min-w-[700px]">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[28%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[hsl(var(--primary)/0.1)] border-b-2 border-primary/25 [&>th]:bg-background">
                  {LEVELS.map((idx) => {
                    const items = activeToggle === "NIC"
                      ? getChildrenFromTree(nicHierarchy, idx, pathForTree)
                      : getCPCChildrenFromTree(cpcHierarchy, idx, pathForTree);
                    return (
                      <th key={idx} className="px-2 py-2.5 text-left align-middle">
                        <LevelDropdown
                          levelName={levelNames[idx]}
                          items={items}
                          selectedCodes={selectedPath[idx]}
                          onSelect={(codes) => handleSelect(idx, codes)}
                          multiSelect={multiSelect}
                          levelIndex={idx}
                          totalLevels={LEVELS.length}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const rows = filteredRows as any[];
                    // Precompute rowSpans for each mergeable column
                    const mergeKeys = ["section", "division", "group", "class"] as const;
                    const spanMap: Record<string, number[]> = {};
                    for (const key of mergeKeys) {
                      const spans = new Array(rows.length).fill(0);
                      let i = 0;
                      while (i < rows.length) {
                        let j = i + 1;
                        // For division, also check section matches; for group, check section+division, etc.
                        const keyIdx = mergeKeys.indexOf(key);
                        while (j < rows.length && mergeKeys.slice(0, keyIdx + 1).every(k => rows[j][k] === rows[i][k])) {
                          j++;
                        }
                        spans[i] = j - i;
                        for (let k = i + 1; k < j; k++) spans[k] = 0;
                        i = j;
                      }
                      spanMap[key] = spans;
                    }
                    return rows.map((row, i) => (
                      <tr key={row.sub_class} className="hover:bg-accent/8 transition-colors bg-card">
                        {spanMap.section[i] > 0 && (
                          <td className="px-3 py-3 text-foreground break-words w-1/5 align-top border-r border-b border-border" rowSpan={spanMap.section[i]}>
                            <span className="font-mono font-semibold text-primary">{row.section}</span>
                            <span className="ml-1 text-xs break-words">{row.section_title}</span>
                          </td>
                        )}
                        {spanMap.division[i] > 0 && (
                          <td className="px-3 py-3 text-foreground break-words w-1/5 align-top border-r border-b border-border" rowSpan={spanMap.division[i]}>
                            <span className="font-mono font-semibold text-foreground">{row.division}</span>
                            <span className="ml-1 text-xs break-words">{row.division_title}</span>
                          </td>
                        )}
                        {spanMap.group[i] > 0 && (
                          <td className="px-3 py-3 text-foreground break-words w-1/5 align-top border-r border-b border-border" rowSpan={spanMap.group[i]}>
                            <span className="font-mono font-semibold text-foreground">{row.group}</span>
                            <span className="ml-1 text-xs break-words">{row.group_title}</span>
                          </td>
                        )}
                        {spanMap.class[i] > 0 && (
                          <td className="px-3 py-3 text-foreground break-words w-1/5 align-top border-r border-b border-border" rowSpan={spanMap.class[i]}>
                            <span className="font-mono font-semibold text-foreground">{row.class}</span>
                            <span className="ml-1 text-xs break-words">{row.class_title}</span>
                            {row.class_description && (
                              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{row.class_description}</p>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 break-words w-1/5 border-b border-border">
                          <span className="font-mono font-semibold text-accent">{row.sub_class}</span>
                          <span className="ml-1 text-xs text-foreground break-words">{row.sub_class_title}</span>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
