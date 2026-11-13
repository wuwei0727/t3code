import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";

export const fingerprint = (entry) =>
  NodeCrypto.createHash("sha256")
    .update(JSON.stringify([entry.text, entry.context]))
    .digest("hex");

export const readJson = (path) => JSON.parse(NodeFS.readFileSync(path, "utf8"));
export const writeJson = (path, data) =>
  NodeFS.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

export function indexEntries(entries, name) {
  if (!Array.isArray(entries)) throw new Error(`${name}: expected an array`);
  const map = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string" || !/^[a-zA-Z][a-zA-Z0-9.]*$/.test(entry.id)) {
      throw new Error(`${name}: invalid key`);
    }
    if (map.has(entry.id)) throw new Error(`${name}: duplicate key ${entry.id}`);
    map.set(entry.id, entry);
  }
  return map;
}

function formatTokens(text) {
  return [
    [
      ...text.matchAll(
        /\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}|\$\{[a-zA-Z][a-zA-Z0-9_]*\}|\{[a-zA-Z][a-zA-Z0-9_]*\}|%(?:\d+\$)?[sdif]/g,
      ),
    ]
      .map((m) => m[0])
      .sort(),
    [...text.matchAll(/https?:\/\/[^\s)<>\]]+/g)].map((m) => m[0]).sort(),
    [...text.matchAll(/`+[^`]*`+|<\/?[A-Za-z][^>]*>|\*+|\n/g)].map((m) => m[0]),
    [...text.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)\)/g)].map((m) => m[1]).sort(),
  ];
}

export function validateText(source, translated) {
  if (/\{[^{}]*,\s*(?:plural|select|selectordinal)\s*,/.test(source)) {
    throw new Error(
      "ICU MessageFormat requires a parser; use separate plural keys for this catalog",
    );
  }
  if (typeof translated !== "string" || !translated.trim() || translated.length > 20000) {
    throw new Error("Translation must be a nonempty string below 20000 characters");
  }
  if (JSON.stringify(formatTokens(source)) !== JSON.stringify(formatTokens(translated))) {
    throw new Error("Translation changes placeholders, links, line breaks or format markers");
  }
}

export function planTranslation(english, chinese, states) {
  const sources = indexEntries(english, "en");
  const targets = indexEntries(chinese, "zh-CN");
  const history = indexEntries(states, "state");
  const pending = [];
  const stale = [];
  const missing = [];
  const nextStates = [];
  for (const entry of english) {
    if (typeof entry.text !== "string" || !entry.text.trim() || typeof entry.context !== "string") {
      throw new Error(`en: missing text or context for ${entry.id}`);
    }
    const hash = fingerprint(entry);
    const previous = history.get(entry.id);
    const target = targets.get(entry.id);
    if (
      previous &&
      (typeof previous.humanReviewed !== "boolean" || typeof previous.sourceHash !== "string")
    ) {
      throw new Error(`state: invalid review metadata for ${entry.id}`);
    }
    const changed = previous && previous.sourceHash !== hash;
    if (changed) stale.push(entry.id);
    if (!target) missing.push(entry.id);
    if (target && !changed) validateText(entry.text, target.text);
    const needsReview = Boolean(previous?.humanReviewed && (changed || !target));
    if ((!target || changed) && !needsReview) pending.push({ ...entry, sourceHash: hash });
    nextStates.push({
      ...previous,
      id: entry.id,
      sourceHash: previous?.sourceHash ?? hash,
      humanReviewed: previous?.humanReviewed ?? false,
      status: needsReview
        ? changed
          ? "stale-reviewed"
          : "missing-reviewed"
        : changed
          ? "stale"
          : target
            ? "current"
            : "missing",
    });
  }
  return {
    pending,
    stale,
    missing,
    states: nextStates,
    removed: [...new Set([...targets.keys(), ...history.keys()])].filter((id) => !sources.has(id)),
  };
}

export function decodeTranslations(content, entries) {
  const result = JSON.parse(content);
  if (!result || Object.keys(result).join() !== "translations")
    throw new Error("Invalid response envelope");
  const values = indexEntries(result.translations, "response");
  if (values.size !== entries.length) throw new Error("Response key count differs from request");
  return entries.map((entry) => {
    const value = values.get(entry.id);
    if (!value || Object.keys(value).sort().join() !== "id,text")
      throw new Error("Unexpected response key or field");
    validateText(entry.text, value.text);
    return { id: entry.id, text: value.text };
  });
}
