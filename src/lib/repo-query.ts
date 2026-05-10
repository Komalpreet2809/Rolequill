const conceptGroups = [
  {
    triggers: ["eda", "exploratory data analysis"],
    expansions: [
      "exploratory",
      "analysis",
      "analytics",
      "data analysis",
      "data cleaning",
      "data preprocessing",
      "feature engineering",
      "visualization",
      "matplotlib",
      "seaborn",
      "plotly",
      "pandas",
      "jupyter",
      "notebook",
      "dataset",
      "correlation",
      "distribution",
      "outlier",
      "missing values",
    ],
  },
  {
    triggers: ["backend", "server side", "api"],
    expansions: [
      "server",
      "rest",
      "api",
      "auth",
      "database",
      "postgres",
      "mongodb",
      "fastapi",
      "express",
      "node",
      "docker",
      "deployment",
      "ci/cd",
      "microservice",
    ],
  },
  {
    triggers: ["full stack", "fullstack"],
    expansions: [
      "frontend",
      "backend",
      "react",
      "next",
      "api",
      "database",
      "ui",
      "ux",
      "auth",
      "deployment",
    ],
  },
  {
    triggers: ["machine learning", "ml", "ai"],
    expansions: [
      "model",
      "training",
      "inference",
      "classification",
      "prediction",
      "tensorflow",
      "pytorch",
      "scikit",
      "neural",
      "deep learning",
    ],
  },
  {
    triggers: ["data science", "analytics"],
    expansions: [
      "statistics",
      "visualization",
      "pandas",
      "notebook",
      "analysis",
      "dataset",
      "cleaning",
      "preprocessing",
    ],
  },
];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .filter((token) => token.length >= 3);
}

export function buildExpandedKeywordSet(text: string) {
  const normalized = text.toLowerCase();
  const tokens = new Set(tokenize(text));

  for (const group of conceptGroups) {
    if (group.triggers.some((trigger) => normalized.includes(trigger))) {
      for (const expansion of group.expansions) {
        for (const token of tokenize(expansion)) {
          tokens.add(token);
        }
      }
    }
  }

  return tokens;
}
