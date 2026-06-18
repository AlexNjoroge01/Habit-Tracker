export interface Theme {
  id: string;
  name: string;
  description: string;
  gradient: string;
}

export const THEMES: Theme[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean and neutral.",
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #737373 100%)",
  },
  {
    id: "ocean",
    name: "Blue Horizon",
    description: "Refreshing and cool.",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e40af 60%, #3b82f6 100%)",
  },
  {
    id: "violet",
    name: "Aubergine",
    description: "Inspired by the night sky.",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 55%, #7c3aed 100%)",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    description: "Capturing the beauty of dawn.",
    gradient: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #fb923c 100%)",
  },
  {
    id: "forest",
    name: "Dark Nature",
    description: "The layers of a forest.",
    gradient: "linear-gradient(135deg, #052e16 0%, #166534 55%, #22c55e 100%)",
  },
  {
    id: "rose",
    name: "Inter Purple",
    description: "This gradient is calm and serene.",
    gradient: "linear-gradient(135deg, #4a0025 0%, #be185d 50%, #f472b6 100%)",
  },
  {
    id: "amber",
    name: "Orangerine",
    description: "Moving from deep brown to vibrant, warm orange.",
    gradient: "linear-gradient(135deg, #451a03 0%, #c2410c 55%, #fb923c 100%)",
  },
  {
    id: "aurora",
    name: "Super Gradient",
    description: "Intense gradient reflects a dramatic sunset.",
    gradient: "linear-gradient(135deg, #4c1d95 0%, #be185d 50%, #f97316 100%)",
  },
];

export const ACCENT_STORAGE_KEY = "accent-theme";
