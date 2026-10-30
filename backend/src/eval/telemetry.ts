export interface EvalGroqCall {
  label: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface EvalGroundingSourceStat {
  label: string;
  ms: number;
  chars: number;
  populated: boolean;
}

export interface EvalTelemetrySnapshot {
  groqCalls: EvalGroqCall[];
  groundingSources: EvalGroundingSourceStat[];
}

let enabled = false;

const state: EvalTelemetrySnapshot = {
  groqCalls: [],
  groundingSources: [],
};

export function setEvalTelemetryEnabled(value: boolean): void {
  enabled = value;
}

export function resetEvalTelemetry(): void {
  state.groqCalls = [];
  state.groundingSources = [];
}

export function recordEvalGroqCall(call: EvalGroqCall): void {
  if (!enabled) return;
  state.groqCalls.push(call);
}

export function recordEvalGroundingSource(
  source: EvalGroundingSourceStat
): void {
  if (!enabled) return;
  state.groundingSources.push(source);
}

export function getEvalTelemetrySnapshot(): EvalTelemetrySnapshot {
  return {
    groqCalls: [...state.groqCalls],
    groundingSources: [...state.groundingSources],
  };
}
