import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeCrypto from "node:crypto";
import * as NodeChildProcess from "node:child_process";

export function scanText(file, source) {
  const results = [];
  for (const [offset, line] of source.split(/\r?\n/).entries()) {
    const patterns = [
      ["jsx-text", />([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g],
      [
        "ui-property",
        /\b(?:title|label|placeholder|accessibilityLabel|description|message|emptyText)\s*[:=]\s*["']([^"'\n]*[A-Za-z][^"'\n]*)["']/g,
      ],
      [
        "ui-expression-review",
        /\b(?:title|label|placeholder|accessibilityLabel|accessibilityHint|description|message|emptyText)\s*=\s*\{([^\n]+\?[^\n]+)\}/g,
      ],
      ["ui-expression-review", /^\s*\{([^\n]+\?[^\n]+)\}\s*$/g],
    ];
    for (const [kind, regex] of patterns) {
      for (const match of line.matchAll(regex)) {
        const text = match[1].trim();
        if (
          kind === "ui-expression-review" &&
          (/\bt\s*\(/.test(text) || !/["'`][^\n]*[A-Za-z]/.test(text))
        )
          continue;
        results.push({
          file,
          line: offset + 1,
          kind,
          text,
          key: NodeCrypto.createHash("sha256")
            .update(JSON.stringify([file, kind, text]))
            .digest("hex"),
        });
      }
    }
  }
  return results;
}

export function scanSources(root = process.cwd(), base) {
  if (base && !/^[a-f0-9]{40}$/.test(base)) throw new Error("--base requires a full commit SHA");
  const files = [];
  const walk = (directory) => {
    for (const entry of NodeFS.readdirSync(directory, { withFileTypes: true })) {
      const path = NodePath.join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name))
        files.push(path);
    }
  };
  walk(NodePath.join(root, "apps/mobile/src"));
  const candidates = files.flatMap((file) =>
    scanText(
      NodePath.relative(root, file).replaceAll("\\", "/"),
      NodeFS.readFileSync(file, "utf8"),
    ),
  );
  let newlyDetected = null;
  if (base) {
    const changed = new Set(
      NodeChildProcess.execFileSync("git", ["diff", "--name-only", base, "--", "apps/mobile/src"], {
        cwd: root,
        encoding: "utf8",
      })
        .trim()
        .split(/\r?\n/),
    );
    newlyDetected = candidates.filter((entry) => changed.has(entry.file));
    const previous = new Set();
    const existing = new Set(
      NodeChildProcess.execFileSync(
        "git",
        ["ls-tree", "-r", "--name-only", base, "--", "apps/mobile/src"],
        {
          cwd: root,
          encoding: "utf8",
        },
      )
        .trim()
        .split(/\r?\n/),
    );
    for (const file of new Set(newlyDetected.map((entry) => entry.file))) {
      if (!existing.has(file)) continue;
      const source = NodeChildProcess.execFileSync("git", ["show", `${base}:${file}`], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 10000000,
      });
      for (const entry of scanText(file, source)) previous.add(entry.key);
    }
    newlyDetected = newlyDetected.filter((entry) => !previous.has(entry.key));
  }
  return {
    complete: false,
    limitations: [
      "Heuristic inventory only; candidates require human review before creating stable keys.",
      "Multiline strings, expressions, Alert calls, shared packages, native Kotlin, widgets and Clerk-hosted UI need separate review.",
      "Single-line UI conditional expressions are source snippets for manual review, not extracted translation messages; other expressions still need separate review.",
      "Do not rewrite source or translate chat content from this report.",
    ],
    filesScanned: files.length,
    candidates,
    newlyDetected,
  };
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !/^--base=[a-f0-9]{40}$/.test(arg)) || args.length > 1)
    throw new Error("Usage: node scan.mjs [--base=FULL_SHA]");
  console.log(JSON.stringify(scanSources(process.cwd(), args[0]?.slice(7)), null, 2));
}
