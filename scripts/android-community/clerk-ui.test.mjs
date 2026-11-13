import * as NodeTest from "node:test";
import * as NodeAssert from "node:assert/strict";
import * as NodeModule from "node:module";
import {
  patchClerkUiSources,
  patchClerkOAuthEntryPoints,
  OAUTH_REDIRECT,
} from "./prepare-clerk-ui.mjs";

const require = NodeModule.createRequire(import.meta.url);
const { configureReceiver } = require("../../apps/mobile/plugins/withCommunityClerkOAuth.cjs");

NodeTest.test(
  "OAuth receiver preserves the community callback and targets the SDK receiver",
  () => {
    const original = {
      $: { "android:name": "com.clerk.api.sso.SSOReceiverActivity", "android:exported": "true" },
      "intent-filter": [
        {
          data: [
            {
              $: {
                "android:scheme": "clerk",
                "android:host": "io.github.wuwei0727.t3code.zh.callback",
              },
            },
          ],
        },
      ],
    };
    const manifest = { application: [{ activity: [original] }] };
    configureReceiver(manifest);
    configureReceiver(manifest);
    NodeAssert.equal(manifest.application[0].activity.length, 1);
    NodeAssert.deepEqual(
      original["intent-filter"].map((f) => f.data[0].$["android:host"]),
      ["io.github.wuwei0727.t3code.zh.callback", "com.t3tools.t3code.callback"],
    );
    NodeAssert.equal(original["intent-filter"][1].category.length, 2);
  },
);

NodeTest.test(
  "pinned UI patch covers sign-in and sign-up and refuses missing or ambiguous anchors",
  () => {
    const vm =
      "Clerk.auth.signUpWithOAuth(provider = provider, unsafeMetadata = unsafeMetadata)\nClerk.auth.signInWithOAuth(provider = provider, transferable = transferable)";
    const effects =
      "  val snackbarScope = rememberCoroutineScope()\nLaunchedEffect(state, defaultErrorMessage)\nval msg = state.message ?: defaultErrorMessage";
    const patched = patchClerkUiSources(vm, effects);
    NodeAssert.equal(patched.viewModel.split(OAUTH_REDIRECT).length - 1, 2);
    NodeAssert.match(
      patched.effects,
      /communityAuthError\(state.message, defaultErrorMessage, redirectExplanation\)/,
    );
    NodeAssert.throws(() => patchClerkUiSources(vm + "\n" + vm, effects), /source changed/);
    NodeAssert.throws(
      () =>
        patchClerkUiSources(
          vm.replace("transferable = transferable", "transferable = false"),
          effects,
        ),
      /source changed/,
    );
    NodeAssert.throws(
      () =>
        patchClerkUiSources(
          vm,
          effects.replace("state.message ?: defaultErrorMessage", "state.message"),
        ),
      /source changed/,
    );
  },
);

NodeTest.test(
  "alternative OAuth methods and connected accounts use the same callback and Google uses browser OAuth",
  () => {
    const sources = {
      signInRedirect:
        "signIn.authenticateWithOAuth(provider = provider, transferable = transferable)",
      connectedAccount: "User.CreateExternalAccountParams(provider = provider)",
      authView: "preferGoogleOneTap: Boolean = true",
    };
    const patched = patchClerkOAuthEntryPoints(sources);
    NodeAssert.ok(patched.signInRedirect.includes(OAUTH_REDIRECT));
    NodeAssert.ok(patched.connectedAccount.includes(OAUTH_REDIRECT));
    NodeAssert.equal(patched.authView, "preferGoogleOneTap: Boolean = false");
    for (const field of Object.keys(sources)) {
      NodeAssert.throws(
        () => patchClerkOAuthEntryPoints({ ...sources, [field]: "changed upstream source" }),
        /source changed/,
      );
    }
  },
);
