export interface TransactionData {
  time: number;       // Seconds elapsed since block start (0 - 172800)
  amount: number;     // Transaction flat amount in USD
  v1: number;         // PCA variable V1
  v2: number;         // PCA variable V2
  v3: number;         // PCA variable V3
  v4: number;         // PCA variable V4
  v5: number;         // PCA variable V5
  v11: number;        // PCA variable V11
  v12: number;        // PCA variable V12
  v14: number;        // PCA variable V14
  v17: number;        // PCA variable V17
}

export interface PredictionResponse {
  prediction: number;   // 0 (Legitimate) or 1 (Fraudulent)
  probability: number;  // Float between 0.0 and 1.0 (e.g. 0.9348)
  latencyMs?: number;   // Calculated API or simulator call time
  error?: string;       // Raw debug message in case of API failure
}

export interface TransactionRecord {
  id: string;
  timestamp: string;      // Human-readable localized time (e.g., 09:34:12)
  inputs: TransactionData;
  result: PredictionResponse;
  mode: "Real Endpoint" | "Simulator";
}

export interface PresetTemplate {
  name: string;
  description: string;
  type: "safe" | "fraud" | "suspect";
  data: TransactionData;
}
