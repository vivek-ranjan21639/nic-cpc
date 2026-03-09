import { CPCHierarchyNode } from "@/data/cpcHierarchy";
import { CPCIndexRecord, cpcIndex } from "@/data/cpcIndex";
import { DropdownItem } from "@/lib/nicUtils";
import { fuzzyMatch, didYouMean } from "@/lib/fuzzySearch";
import type { CrossLevelResult } from "@/lib/nicUtils";

export const CPC_LEVEL_NAMES = ["Section", "Division", "Group", "Class", "Sub-class"] as const;

export interface CPCFlatRow {
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

export function flattenCPCHierarchy(tree: CPCHierarchyNode[]): CPCFlatRow[] {
  const rows: CPCFlatRow[] = [];

  function walk(
    node: CPCHierarchyNode,
    path: Partial<CPCFlatRow>
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
      const indexRec = cpcIndex[node.code];
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

export function getCPCChildrenFromTree(
  tree: CPCHierarchyNode[],
  depth: number,
  selectedPath: (string | null)[]
): DropdownItem[] {
  if (depth === 0) return tree.map((n) => ({ code: n.code, title: n.title }));

  const parentCode = selectedPath[depth - 1];

  if (parentCode) {
    const parent = findNode(tree, parentCode);
    return (parent?.children ?? []).map((n) => ({ code: n.code, title: n.title }));
  }

  return collectAtLevel(tree, depth);
}

function findNode(nodes: CPCHierarchyNode[], code: string): CPCHierarchyNode | undefined {
  for (const node of nodes) {
    if (node.code === code) return node;
    if (node.children) {
      const found = findNode(node.children, code);
      if (found) return found;
    }
  }
  return undefined;
}

function collectAtLevel(nodes: CPCHierarchyNode[], depth: number, currentDepth = 0): DropdownItem[] {
  if (currentDepth === depth) return nodes.map((n) => ({ code: n.code, title: n.title }));
  const result: DropdownItem[] = [];
  for (const node of nodes) {
    if (node.children) result.push(...collectAtLevel(node.children, depth, currentDepth + 1));
  }
  return result;
}

export function getCPCAncestorPath(tree: CPCHierarchyNode[], code: string): (string | null)[] {
  const path: (string | null)[] = [null, null, null, null, null];
  const LEVEL_TO_INDEX: Record<string, number> = { section: 0, division: 1, group: 2, class: 3, sub_class: 4 };

  function walk(nodes: CPCHierarchyNode[], ancestors: CPCHierarchyNode[]): boolean {
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

export function searchCPCIndex(query: string): { code: string; record: CPCIndexRecord }[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return Object.entries(cpcIndex)
    .filter(([, rec]) => rec.title.toLowerCase().includes(q) || rec.search_text.toLowerCase().includes(q))
    .map(([code, record]) => ({ code, record }));
}

export function getCPCPathFromIndex(code: string): (string | null)[] {
  const rec = cpcIndex[code];
  if (!rec) return [null, null, null, null, null];
  return [rec.section, rec.division, rec.group, rec.class, code];
}

const CPC_LEVEL_MAP: Record<string, number> = { section: 0, division: 1, group: 2, class: 3, sub_class: 4 };

/** Search all CPC hierarchy levels by keyword */
export function searchAllCPCLevels(tree: CPCHierarchyNode[], query: string): { results: CrossLevelResult[]; suggestion: string | null } {
  if (!query.trim()) return { results: [], suggestion: null };
  const q = query.toLowerCase().trim();
  const results: CrossLevelResult[] = [];
  const allTitles: string[] = [];

  function walk(nodes: CPCHierarchyNode[]) {
    for (const node of nodes) {
      allTitles.push(node.title);
      const titleLower = node.title.toLowerCase();
      const codeLower = node.code.toLowerCase();
      if (titleLower.includes(q) || codeLower.includes(q)) {
        const levelIndex = CPC_LEVEL_MAP[node.level] ?? 4;
        results.push({
          code: node.code,
          title: node.title,
          level: CPC_LEVEL_NAMES[levelIndex],
          levelIndex,
        });
      }
      if (node.children) walk(node.children);
    }
  }

  walk(tree);

  let suggestion: string | null = null;
  if (results.length === 0 && q.length >= 3) {
    suggestion = didYouMean(query, allTitles, 3);
  }

  return { results, suggestion };
}
