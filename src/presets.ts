import { PresetTemplate } from "./types";

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "Routine Coffee Swipe",
    description: "Low-value domestic restaurant charge with common transactional properties.",
    type: "safe",
    data: {
      time: 1420,
      amount: 4.85,
      v1: 1.15,
      v2: -0.25,
      v3: 0.85,
      v4: 0.52,
      v5: -0.81,
      v11: -0.45,
      v12: 0.22,
      v14: 0.18,
      v17: -0.05,
    }
  },
  {
    name: "Grocery Superstore Purchase",
    description: "Medium-value midday retail transaction conforming to typical daily behavior.",
    type: "safe",
    data: {
      time: 43200, // 12 hours from arbitrary epoch
      amount: 112.40,
      v1: 0.98,
      v2: 0.12,
      v3: -0.45,
      v4: 1.10,
      v5: 0.35,
      v11: -0.15,
      v12: 0.58,
      v14: -0.24,
      v17: 0.11,
    }
  },
  {
    name: "Suspicious Split Cash-Out",
    description: "Large foreign transfer with high divergence in latent structural dimensions (negative V14 & V17).",
    type: "fraud",
    data: {
      time: 98110,
      amount: 2450.00,
      v1: -4.32,
      v2: 3.12,
      v3: -5.45,
      v4: 4.80,
      v5: -2.90,
      v11: 3.54,
      v12: -4.20,
      v14: -5.92,
      v17: -7.15,
    }
  },
  {
    name: "Rapid Micro-Charges",
    description: "Low amount, but carries classical adversarial anomalies (correlated V11 and negative V12).",
    type: "suspect",
    data: {
      time: 120400,
      amount: 1.25,
      v1: -1.82,
      v2: 2.15,
      v3: -1.90,
      v4: 2.05,
      v5: -1.10,
      v11: 2.60,
      v12: -2.95,
      v14: -3.10,
      v17: -2.40,
    }
  }
];
