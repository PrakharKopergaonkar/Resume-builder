import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { newUser, STORAGE_STATE } from "./auth-helpers";

/** Every spec runs signed in as one throwaway user (removed again in global-teardown.ts). */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const { api } = await newUser(baseURL, "E2E User");
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  await api.storageState({ path: STORAGE_STATE });
  await api.dispose();
}
