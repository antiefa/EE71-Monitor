/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(projectRoot, "extension");
const buildRoot = join(projectRoot, "build");
const firefoxManifest = join(sourceDir, "manifest.firefox.json");
const yandexManifest = join(sourceDir, "manifest.yandex.json");
const alternateManifests = new Set([firefoxManifest, yandexManifest]);

async function copySharedFiles(targetDir) {
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter(source) {
      return !alternateManifests.has(source);
    }
  });
}

async function buildBrowser(browser) {
  const targetDir = join(buildRoot, browser);
  await rm(targetDir, { recursive: true, force: true });
  await copySharedFiles(targetDir);

  if (browser === "firefox") {
    await cp(firefoxManifest, join(targetDir, "manifest.json"));
  } else if (browser === "yandex") {
    await cp(yandexManifest, join(targetDir, "manifest.json"));
  }
}

await mkdir(buildRoot, { recursive: true });
await buildBrowser("chrome");
await buildBrowser("firefox");
await buildBrowser("yandex");

console.log("Built build/chrome, build/firefox and build/yandex");
