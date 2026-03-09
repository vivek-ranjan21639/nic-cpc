import { HierarchyNode } from "@/data/nicHierarchy";
import { NICIndexRecord, nicIndex } from "@/data/nicIndex";
import { fuzzyMatch, didYouMean } from "@/lib/fuzzySearch";

export const LEVEL_NAMES = ["Section", "Division", "Group", "Class", "Sub-class"] as const;

export interface DropdownItem {
  code: string;
  title: string;
}

export interface FlatRow {
  section: string;
  section_title: string;
  division: string;
  division_title: string;
  group: string;
  group_title: string;
  class: string;
  class_title: string;
  class_description: string | null;
  sub_class: string;
  sub_class_title: string;
}

/** Flatten the entire hierarchy into table rows (one row per leaf/sub_class) */
export function flattenHierarchy(tree: HierarchyNode[]): FlatRow[] {
  const rows: FlatRow[] = [];

  function walk(
    node: HierarchyNode,
    path: { section?: string; section_title?: string; division?: string; division_title?: string; group?: string; group_title?: string; class?: string; class_title?: string }
  ) {
    const current = { ...path };

    if (node.level === "section") {
      current.section = node.code;
      current.section_title = node.title;
    } else if (node.level === "division") {
      current.division = node.code;
      current.division_title = node.title;
    } else if (node.level === "group") {
      current.group = node.code;
      current.group_title = node.title;
    } else if (node.level === "class") {
      current.class = node.code;
      current.class_title = node.title;
    } else if (node.level === "sub_class") {
      const indexRec = nicIndex[node.code];
      rows.push({
        section: current.section || "",
        section_title: current.section_title || "",
        division: current.division || "",
        division_title: current.division_title || "",
        group: current.group || "",
        group_title: current.group_title || "",
        class: current.class || "",
        class_title: current.class_title || "",
        class_description: indexRec?.class_description != null ? String(indexRec.class_description) : null,
        sub_class: node.code,
        sub_class_title: node.title,
      });
      return;
    }

    if (node.children) {
      for (const child of node.children) walk(child, current);
    }
  }

  for (const root of tree) walk(root, {});
  return rows;
}

/** Get unique values for a column from rows */
export function getUniqueValues(rows: FlatRow[], key: keyof FlatRow): DropdownItem[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const code = row[key];
    const titleKey = key.endsWith("_title") ? key : (`${key}_title` as keyof FlatRow);
    if (code && !seen.has(code)) {
      seen.set(code, row[titleKey] || code);
    }
  }
  return Array.from(seen.entries()).map(([code, title]) => ({ code, title }));
}

/** Get children of a node at a given depth in the hierarchy tree.
 *  If no parent is selected, returns ALL items at that level. */
export function getChildrenFromTree(
  tree: HierarchyNode[],
  depth: number,
  selectedPath: (string | null)[]
): DropdownItem[] {
  if (depth === 0) return tree.map((n) => ({ code: n.code, title: n.title }));

  const parentCode = selectedPath[depth - 1];

  // If parent is selected, return only its children
  if (parentCode) {
    const parent = findNodeInTree(tree, parentCode);
    return (parent?.children ?? []).map((n) => ({ code: n.code, title: n.title }));
  }

  // No parent selected — collect ALL nodes at this level
  return collectAtLevel(tree, depth);
}

function findNodeInTree(nodes: HierarchyNode[], code: string): HierarchyNode | undefined {
  for (const node of nodes) {
    if (node.code === code) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, code);
      if (found) return found;
    }
  }
  return undefined;
}

/** Collect all items at a given depth (0-indexed) */
function collectAtLevel(nodes: HierarchyNode[], depth: number, currentDepth = 0): DropdownItem[] {
  if (currentDepth === depth) return nodes.map((n) => ({ code: n.code, title: n.title }));
  const result: DropdownItem[] = [];
  for (const node of nodes) {
    if (node.children) result.push(...collectAtLevel(node.children, depth, currentDepth + 1));
  }
  return result;
}

/** Given a code at any level, find its full ancestor path */
export function getAncestorPath(tree: HierarchyNode[], code: string): (string | null)[] {
  const path: (string | null)[] = [null, null, null, null, null];
  const LEVEL_TO_INDEX: Record<string, number> = { section: 0, division: 1, group: 2, class: 3, sub_class: 4 };

  function walk(nodes: HierarchyNode[], ancestors: HierarchyNode[]): boolean {
    for (const node of nodes) {
      const current = [...ancestors, node];
      if (node.code === code) {
        for (const a of current) {
          const idx = LEVEL_TO_INDEX[a.level];
          if (idx !== undefined) path[idx] = a.code;
        }
        return true;
      }
      if (node.children && walk(node.children, current)) return true;
    }
    return false;
  }

  walk(tree, []);
  return path;
}

/** Search the flat index by keyword */
export function searchIndex(query: string): { code: string; record: NICIndexRecord }[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return Object.entries(nicIndex)
    .filter(([, rec]) => rec.title.toLowerCase().includes(q) || rec.search_text.toLowerCase().includes(q))
    .map(([code, record]) => ({ code, record }));
}

/** Given a sub-class code from the index, return the full 5-level path */
export function getPathFromIndex(code: string): (string | null)[] {
  const rec = nicIndex[code];
  if (!rec) return [null, null, null, null, null];
  return [rec.section, rec.division, rec.group, rec.class, code];
}

export interface CrossLevelResult {
  code: string;
  title: string;
  level: string;
  levelIndex: number;
}

const LEVEL_MAP: Record<string, number> = { section: 0, division: 1, group: 2, class: 3, sub_class: 4 };

/** Search all hierarchy levels by keyword, returns results grouped by level */
export function searchAllLevels(tree: HierarchyNode[], query: string): { results: CrossLevelResult[]; suggestion: string | null } {
  if (!query.trim()) return { results: [], suggestion: null };
  const q = query.toLowerCase().trim();
  const results: CrossLevelResult[] = [];
  const allTitles: string[] = [];

  function walk(nodes: HierarchyNode[]) {
    for (const node of nodes) {
      allTitles.push(node.title);
      const titleLower = node.title.toLowerCase();
      const codeLower = node.code.toLowerCase();
      if (titleLower.includes(q) || codeLower.includes(q)) {
        const levelIndex = LEVEL_MAP[node.level] ?? 4;
        results.push({
          code: node.code,
          title: node.title,
          level: LEVEL_NAMES[levelIndex],
          levelIndex,
        });
      }
      if (node.children) walk(node.children);
    }
  }

  walk(tree);

  // Show fuzzy suggestion when no exact results found
  let suggestion: string | null = null;
  if (results.length === 0 && q.length >= 3) {
    suggestion = didYouMean(query, allTitles, 3);
  }

  return { results, suggestion };
}
