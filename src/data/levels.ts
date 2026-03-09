export interface LevelItem {
  id: string;
  label: string;
  children?: LevelItem[];
}

export const levelData: LevelItem[] = [
  {
    id: "1.1",
    label: "Legal Framework",
    children: [
      {
        id: "1.1.1",
        label: "Statistical Legislation",
        children: [
          { id: "1.1.1.1", label: "Data Collection Laws", children: [{ id: "1.1.1.1.1", label: "Survey Mandates" }] },
          { id: "1.1.1.2", label: "Privacy Regulations", children: [{ id: "1.1.1.2.1", label: "Data Protection" }] },
        ],
      },
      {
        id: "1.1.2",
        label: "Institutional Mandate",
        children: [
          { id: "1.1.2.1", label: "Organizational Charter", children: [{ id: "1.1.2.1.1", label: "Mission Statement" }] },
          { id: "1.1.2.2", label: "Governance Structure", children: [{ id: "1.1.2.2.1", label: "Board Composition" }] },
        ],
      },
    ],
  },
  {
    id: "1.2",
    label: "Strategic Planning",
    children: [
      {
        id: "1.2.1",
        label: "Vision & Mission",
        children: [
          { id: "1.2.1.1", label: "Long-term Goals", children: [{ id: "1.2.1.1.1", label: "5-Year Plan" }] },
          { id: "1.2.1.2", label: "Key Priorities", children: [{ id: "1.2.1.2.1", label: "Resource Allocation" }] },
        ],
      },
      {
        id: "1.2.2",
        label: "Action Plans",
        children: [
          { id: "1.2.2.1", label: "Annual Work Plan", children: [{ id: "1.2.2.1.1", label: "Quarterly Targets" }] },
          { id: "1.2.2.2", label: "Performance Metrics", children: [{ id: "1.2.2.2.1", label: "KPI Dashboard" }] },
        ],
      },
    ],
  },
  {
    id: "1.3",
    label: "Human Resources",
    children: [
      {
        id: "1.3.1",
        label: "Staff Development",
        children: [
          { id: "1.3.1.1", label: "Training Programs", children: [{ id: "1.3.1.1.1", label: "Technical Skills" }] },
          { id: "1.3.1.2", label: "Capacity Building", children: [{ id: "1.3.1.2.1", label: "Leadership Training" }] },
        ],
      },
      {
        id: "1.3.2",
        label: "Recruitment",
        children: [
          { id: "1.3.2.1", label: "Hiring Process", children: [{ id: "1.3.2.1.1", label: "Job Descriptions" }] },
          { id: "1.3.2.2", label: "Retention Strategy", children: [{ id: "1.3.2.2.1", label: "Employee Benefits" }] },
        ],
      },
    ],
  },
  {
    id: "1.4",
    label: "Infrastructure",
    children: [
      {
        id: "1.4.1",
        label: "IT Systems",
        children: [
          { id: "1.4.1.1", label: "Hardware", children: [{ id: "1.4.1.1.1", label: "Server Management" }] },
          { id: "1.4.1.2", label: "Software", children: [{ id: "1.4.1.2.1", label: "Licensing" }] },
        ],
      },
      {
        id: "1.4.2",
        label: "Physical Facilities",
        children: [
          { id: "1.4.2.1", label: "Office Space", children: [{ id: "1.4.2.1.1", label: "Regional Offices" }] },
          { id: "1.4.2.2", label: "Equipment", children: [{ id: "1.4.2.2.1", label: "Field Equipment" }] },
        ],
      },
    ],
  },
];

// Helper: get items at a specific depth from a tree
export function getItemsAtDepth(
  items: LevelItem[],
  depth: number,
  selectedPath: (string | null)[]
): LevelItem[] {
  if (depth === 0) return items;

  const parentId = selectedPath[depth - 1];
  if (!parentId) return [];

  // Find the parent recursively
  function findById(nodes: LevelItem[], id: string): LevelItem | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  const parent = findById(items, parentId);
  return parent?.children ?? [];
}
