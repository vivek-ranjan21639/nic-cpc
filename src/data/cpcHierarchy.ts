export interface CPCHierarchyNode {
  code: string;
  title: string;
  level: "section" | "division" | "group" | "class" | "sub_class";
  children?: CPCHierarchyNode[];
}

import data from "./cpcHierarchy.json";
export const cpcHierarchy: CPCHierarchyNode[] = data as CPCHierarchyNode[];
