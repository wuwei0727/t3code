import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { readJson } from "./catalog.mjs";

export function selectAndroidRelease(releases) {
  const candidates = releases.filter(
    (release) =>
      !release.draft && release.prerelease && /^android-beta-\d+$/.test(release.tag_name),
  );
  candidates.sort((a, b) => Number(b.tag_name.slice(13)) - Number(a.tag_name.slice(13)));
  const release = candidates[0];
  if (!release)
    throw new Error("No versioned Android beta release found; refusing desktop/latest fallback");
  const match = release.body?.match(/Build: (\d+\.\d+\.\d+) \((\d+)\)\./);
  if (!match || Number(match[2]) !== Number(release.tag_name.slice(13))) {
    throw new Error("Android release metadata changed; manual review required");
  }
  return {
    tag: release.tag_name,
    versionName: match[1],
    versionCode: Number(match[2]),
    releaseUrl: release.html_url,
    publishedAt: release.published_at,
    sourceCommit: null,
    sourceProvenanceVerified: false,
  };
}

export async function inspectUpstream(state, fetchImpl = fetch, token = process.env.GH_TOKEN) {
  if (state.upstreamRepository !== "pingdotgg/t3code" || state.channel !== "android-beta") {
    throw new Error(
      "Only the public Android beta mirror is currently supported; production mapping requires review",
    );
  }
  const api = async (suffix) => {
    const response = await fetchImpl(`https://api.github.com/repos/pingdotgg/t3code/${suffix}`, {
      headers: {
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`GitHub metadata request failed: HTTP ${response.status}`);
    return response.json();
  };
  const releases = [];
  let complete = false;
  for (let page = 1; page <= 20; page++) {
    const batch = await api(`releases?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error("Unexpected GitHub releases response");
    releases.push(...batch);
    if (batch.length < 100) {
      complete = true;
      break;
    }
  }
  if (!complete)
    throw new Error("Release history exceeds scan limit; refusing to guess newest Android version");
  const selected = selectAndroidRelease(releases);
  let object = (await api(`git/ref/tags/${selected.tag}`)).object;
  for (let depth = 0; object?.type === "tag" && depth < 5; depth++) {
    object = (await api(`git/tags/${object.sha}`)).object;
  }
  if (object?.type !== "commit" || !/^[a-f0-9]{40}$/.test(object.sha))
    throw new Error("Cannot resolve Android mirror tag");
  return {
    ...selected,
    tagCommit: object.sha,
    changed:
      selected.tag !== state.latestObserved?.tag || object.sha !== state.latestObserved?.tagCommit,
    maintenanceBranch: `community/android/${selected.tag}`,
    automationGate: "blocked-source-provenance-and-baseline-build",
    reason:
      "The mirror tag records publication, not the APK build SHA. Independently verify source mapping and an unmodified build before merging.",
  };
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  try {
    console.log(
      JSON.stringify(
        await inspectUpstream(readJson("community/android/maintenance.json")),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
