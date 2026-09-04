import { existsSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const version = packageJson.version;
const checks = [
  ["package-lock root", packageLock.version === version],
  ["package-lock workspace", packageLock.packages?.[""]?.version === version],
  ["runtime release constant", readFileSync("src/data/release.ts", "utf8").includes(`APP_VERSION = "${version}"`)],
  ["README current heading", readFileSync("README.md", "utf8").includes(`## Rules-engine build ${version}`)],
  ["chart status heading", readFileSync("docs/CHART_TRANSCRIPTION_STATUS.md", "utf8").includes(`build ${version}`)],
  ["release checkpoint", existsSync(`docs/PROJECT_CHECKPOINT_${version}.md`)],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failures.length) {
  throw new Error(`Release ${version} is inconsistent: ${failures.join(", ")}`);
}
console.log(`Release metadata verified for ${version}.`);
