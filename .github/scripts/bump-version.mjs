import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { applyRelease, bumpPatch } from "./release-lib.mjs";

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error("GITHUB_REPOSITORY is not set");

const path = "module.json";
const manifest = JSON.parse(readFileSync(path, "utf8"));
const version = bumpPatch(manifest.version);

writeFileSync(path, `${JSON.stringify(applyRelease(manifest, repo, version), null, 2)}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
console.log(version);
