export const sourceControlHintKeys = {
  "Provider status unavailable. Open Source Control settings and rescan.":
    "sourceControlHintUi.unavailable",
  "Add a Bitbucket token in Settings → Source Control.": "sourceControlHintUi.bitbucketShort",
  "Install the GitHub command-line tool (`gh`) via https://cli.github.com/ or your package manager (for example `brew install gh`).":
    "sourceControlHintUi.github",
  "Install the GitCafe CLI with `bun install -g @gitcafe/cli`, then run `cafe auth login --host https://git.cafe/api`, save a token in Settings, or set CAFE_TOKEN on the server.":
    "sourceControlHintUi.gitcafe",
  "Install `fj` 0.6 or later from https://codeberg.org/forgejo-contrib/forgejo-cli and run `fj --host <server-url> auth add-token`, or install `tea` 0.16 or later from https://gitea.com/gitea/tea and run `tea login add` for each Forgejo or Gitea server.":
    "sourceControlHintUi.forgejo",
  "Install the Origin CLI with `curl -fsSL https://downloads.cursor.com/origin/install.sh | sh`, then run `origin auth login`.":
    "sourceControlHintUi.origin",
  "Add a Bitbucket token in Settings → Source Control, or set the T3CODE_BITBUCKET_* environment variables on the server.":
    "sourceControlHintUi.bitbucket",
  "Install the Azure command-line tools (`az`), then enable Azure DevOps support with `az extension add --name azure-devops`.":
    "sourceControlHintUi.azure",
} as const;
