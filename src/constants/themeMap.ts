export type ThemeColors = {
  header: string;
  body: string;
  border: string;
  text: string;
  box: string;
};

export const themeMap: Record<string, ThemeColors> = {
  orange: {
    header: "#fa9549",
    body: "#252836",
    border: "#fa9549",
    text: "#1a1a2e",
    box: "#1a1a2e",
  },
  purple: {
    header: "#8b5cf6",
    body: "#252836",
    border: "#8b5cf6",
    text: "#1a1a2e",
    box: "#1a1a2e",
  },
  blue: {
    header: "#60a5fa",
    body: "#252836",
    border: "#60a5fa",
    text: "#0f172a",
    box: "#1a1a2e",
  },
  dark: {
    header: "#111827",
    body: "#0b0f1a",
    border: "#374151",
    text: "#e5e7eb",
    box: "#1a1a2e",
  },
  slate: {
    header: "#64748b",
    body: "#1f2937",
    border: "#94a3b8",
    text: "#0f172a",
    box: "#1a1a2e",
  },
  green: {
    header: "#22c55e",
    body: "#1a2e1f",
    border: "#22c55e",
    text: "#0f1a12",
    box: "#1a1a2e",
  },
  rose: {
    header: "#f43f5e",
    body: "#2e1a22",
    border: "#f43f5e",
    text: "#1a0f14",
    box: "#1a1a2e",
  },
  teal: {
    header: "#14b8a6",
    body: "#1a2e2b",
    border: "#14b8a6",
    text: "#0f1a18",
    box: "#1a1a2e",
  },
  amber: {
    header: "#f59e0b",
    body: "#2e2a1a",
    border: "#f59e0b",
    text: "#1a170f",
    box: "#1a1a2e",
  },
  limestone: {
    header: "#d6b48c",
    body: "#2a241b",
    border: "#d6b48c",
    text: "#1a140d",
    box: "#1a1a2e",
  },
  indigo: {
    header: "#6366f1",
    body: "#1e1a2e",
    border: "#6366f1",
    text: "#0f0e1a",
    box: "#2d2640",
  },
};

const themeOrder = [
  "dark",
  "orange",
  "blue",
  "purple",
  "slate",
  "green",
  "rose",
  "teal",
  "amber",
  "limestone",
  "indigo",
] as const;

const formatThemeLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const themeOptions = [
  { label: "Default", value: "" },
  ...themeOrder.map((value) => ({ label: formatThemeLabel(value), value })),
];

export const getThemeColors = (theme?: string) =>
  (theme && themeMap[theme]) || themeMap.orange;
