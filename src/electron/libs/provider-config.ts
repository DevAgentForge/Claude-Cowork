import type { LlmProviderConfig } from "../types.js";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "fs";
import { join } from "path";
import { app, nativeSafeStorage } from "electron";
import { randomUUID } from "crypto";

const PROVIDERS_FILE = join(app.getPath("userData"), "providers.json");

/**
 * Encrypt sensitive fields before storage (CWE-200 mitigation)
 */
function encryptSensitiveData(provider: LlmProviderConfig): LlmProviderConfig {
  const encrypted = { ...provider };
  if (encrypted.authToken) {
    try {
      encrypted.authToken = nativeSafeStorage.encryptString(encrypted.authToken).toString("base64");
    } catch {
      // If encryption fails, keep original (not ideal but don't break functionality)
    }
  }
  return encrypted;
}

/**
 * Decrypt sensitive fields after reading from storage
 */
function decryptSensitiveData(provider: LlmProviderConfig): LlmProviderConfig {
  const decrypted = { ...provider };
  if (decrypted.authToken) {
    try {
      decrypted.authToken = nativeSafeStorage.decryptString(Buffer.from(decrypted.authToken, "base64"));
    } catch {
      // If decryption fails, return as-is (may be plaintext from older version)
    }
  }
  return decrypted;
}

export function loadProviders(): LlmProviderConfig[] {
  try {
    if (existsSync(PROVIDERS_FILE)) {
      const raw = readFileSync(PROVIDERS_FILE, "utf8");
      const providers = JSON.parse(raw) as LlmProviderConfig[];
      if (!Array.isArray(providers)) return [];
      // Decrypt sensitive data for each provider
      return providers.map(decryptSensitiveData);
    }
  } catch {
    // Ignore missing or invalid providers file
  }
  return [];
}

export function saveProvider(provider: LlmProviderConfig): LlmProviderConfig {
  // Reload providers fresh (don't use cached decrypted versions)
  const providers: LlmProviderConfig[] = [];
  try {
    if (existsSync(PROVIDERS_FILE)) {
      const raw = readFileSync(PROVIDERS_FILE, "utf8");
      const parsed = JSON.parse(raw) as LlmProviderConfig[];
      if (Array.isArray(parsed)) {
        // Decrypt existing providers to merge properly
        parsed.forEach(p => providers.push(decryptSensitiveData(p)));
      }
    }
  } catch {
    // Ignore missing or invalid providers file
  }

  const existingIndex = providers.findIndex((p) => p.id === provider.id);

  const providerToSave = existingIndex >= 0
    ? { ...providers[existingIndex], ...provider }
    : { ...provider, id: provider.id || randomUUID() };

  if (existingIndex >= 0) {
    providers[existingIndex] = providerToSave;
  } else {
    providers.push(providerToSave);
  }

  // Encrypt sensitive data before storage
  const encryptedProviders = providers.map(encryptSensitiveData);
  writeFileSync(PROVIDERS_FILE, JSON.stringify(encryptedProviders, null, 2));

  // Set restrictive file permissions (owner read/write only)
  try {
    chmodSync(PROVIDERS_FILE, 0o600);
  } catch {
    // Ignore permission errors (may not be supported on all platforms)
  }

  return providerToSave;
}

export function deleteProvider(providerId: string): boolean {
  const providers = loadProviders();
  const filtered = providers.filter((p) => p.id !== providerId);
  if (filtered.length === providers.length) {
    return false;
  }
  // Encrypt before saving
  const encryptedProviders = filtered.map(encryptSensitiveData);
  writeFileSync(PROVIDERS_FILE, JSON.stringify(encryptedProviders, null, 2));
  return true;
}

export function getProvider(providerId: string): LlmProviderConfig | null {
  const providers = loadProviders();
  return providers.find((p) => p.id === providerId) || null;
}

/**
 * Get environment variables for a specific provider configuration.
 * This allows overriding the default Claude Code settings with custom provider settings.
 */
export function getProviderEnv(provider: LlmProviderConfig): Record<string, string> {
  const env: Record<string, string> = {};

  if (provider.baseUrl) {
    env.ANTHROPIC_BASE_URL = provider.baseUrl;
  }

  if (provider.authToken) {
    env.ANTHROPIC_AUTH_TOKEN = provider.authToken;
  }

  if (provider.defaultModel) {
    env.ANTHROPIC_MODEL = provider.defaultModel;
  }

  if (provider.models?.opus) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = provider.models.opus;
  }

  if (provider.models?.sonnet) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = provider.models.sonnet;
  }

  if (provider.models?.haiku) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = provider.models.haiku;
  }

  return env;
}
