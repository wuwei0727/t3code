import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeChildProcess from "node:child_process";

export function preflight(root = process.cwd()) {
  const pkg = JSON.parse(NodeFS.readFileSync(NodePath.resolve(root, "package.json"), "utf8"));
  const blockers = [];
  if (process.versions.node !== pkg.engines.node)
    blockers.push(`Node ${pkg.engines.node} required; current ${process.versions.node}`);
  const localVp = NodePath.resolve(root, "node_modules/vite-plus/bin/vp");
  const vp = NodeFS.existsSync(localVp)
    ? NodeChildProcess.spawnSync(process.execPath, [localVp, "--version"], {
        encoding: "utf8",
        cwd: root,
        shell: false,
      })
    : NodeChildProcess.spawnSync("vp", ["--version"], {
        encoding: "utf8",
        cwd: root,
        shell: false,
      });
  if (vp.error || vp.status !== 0)
    blockers.push("vp is unavailable; use the pinned Ubuntu baseline workflow");
  if (!NodeFS.existsSync(NodePath.resolve(root, "apps/mobile/node_modules/expo/bin/cli")))
    blockers.push("Mobile Expo dependencies are not installed");
  return {
    node: process.versions.node,
    requiredNode: pkg.engines.node,
    packageManager: pkg.packageManager,
    buildPassed: false,
    blockers,
    next: "Run Community Android Baseline on the fork default branch. Never mark a baseline passed from preflight alone.",
  };
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  const result = preflight();
  console.log(JSON.stringify(result, null, 2));
  if (result.blockers.length) process.exitCode = 1;
}
