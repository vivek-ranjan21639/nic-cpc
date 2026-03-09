export interface NICIndexRecord {
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

import rawData from "./nicIndex.json?raw";

// The source JSON contains NaN values (invalid JSON) — fix them at load time
const sanitized = rawData.replace(/\bNaN\b/g, "null");
export const nicIndex: Record<string, NICIndexRecord> = JSON.parse(sanitized);
