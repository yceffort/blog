// public/sw.js cannot import this module, so it repeats these names.
// scripts/generate-offline-runtime.mjs fails the build when the two differ.
export const META_CACHE = 'research-offline-meta-v1'
export const RUNTIME_KEY = '/__research_offline_runtime__'
export const RUNTIME_PREFIX = 'research-runtime-v1-'
export const DECK_PREFIX = 'research-deck-v1-'
