export interface HierarchyNode {
  code: string;
  title: string;
  level: "section" | "division" | "group" | "class" | "sub_class";
  children?: HierarchyNode[];
}

import data from "./nicHierarchy.json";
export const nicHierarchy: HierarchyNode[] = data as HierarchyNode[];
