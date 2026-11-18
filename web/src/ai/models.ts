// One model instance per feature, each with an explicit inference mode:
//
//   feature          mode               why
//   room helper      PREFER_ON_DEVICE   public text; free and instant on device, works everywhere via cloud
//   find options     ONLY_IN_CLOUD      needs world knowledge + Grounding with Google Maps
//   understand note  ONLY_ON_DEVICE     private; must never leave the device (see gate.ts)
//   private fit      ONLY_ON_DEVICE     private; must never leave the device (see gate.ts)
//   explain winner   PREFER_ON_DEVICE   public facts only
//
// Hybrid gotcha: when `mode` is set, top-level model/systemInstruction/generationConfig are ignored.
// Cloud settings go in inCloudParams; the on-device system prompt goes in initialPrompts.

import { getGenerativeModel, InferenceMode, type GenerativeModel, type Tool, type ToolConfig } from 'firebase/ai';
import { ai, cfg } from '../firebase';
import { TEXT_ONLY } from './gate';

function systemPrompt(text: string) {
  return [{ role: 'system' as const, content: [{ type: 'text' as const, value: text }] }];
}

function jsonConfig(schema?: object) {
  return schema ? { responseMimeType: 'application/json', responseJsonSchema: schema as Record<string, unknown> } : undefined;
}

/** Private features. No inCloudParams on purpose; always call assertDeviceReady() first. */
export function onDeviceOnly(system: string, schema?: object): GenerativeModel {
  return getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: { ...TEXT_ONLY, initialPrompts: systemPrompt(system) },
      promptOptions: schema ? { responseConstraint: schema } : undefined,
    },
  });
}

/** Public features that need the cloud's knowledge or tools. */
export function cloudOnly(opts: {
  system: string;
  schema?: object;
  tools?: Tool[];
  toolConfig?: ToolConfig;
}): GenerativeModel {
  return getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: cfg.cloudModel(),
      systemInstruction: opts.system,
      tools: opts.tools,
      toolConfig: opts.toolConfig,
      generationConfig: jsonConfig(opts.schema),
    },
  });
}

/** Public features: on-device when this browser can, cloud otherwise. */
export function preferDevice(system: string, schema?: object): GenerativeModel {
  return getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: cfg.cloudModelLite(),
      systemInstruction: system,
      generationConfig: jsonConfig(schema),
    },
    onDeviceParams: {
      createOptions: { ...TEXT_ONLY, initialPrompts: systemPrompt(system) },
      promptOptions: schema ? { responseConstraint: schema } : undefined,
    },
  });
}
