export interface CPCIndexRecord {
  section: string;
  section_title: string;
  division: string;
  division_title: string;
  group: string;
  group_title: string;
  class: string;
  class_title: string | number;
  class_description: string | number | null;
  title: string;
  search_text: string;
}

import data from "./cpcIndex.json";
export const cpcIndex: Record<string, CPCIndexRecord> = data as Record<string, CPCIndexRecord>;
