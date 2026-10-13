# Versioned releases and GHCR verification

## Prerequisites

- Maintainer permission to merge approved changes and create/push release tags.
- `gh`, Git, Docker Buildx, `jq`, and authenticated access to the repository and GHCR package.
- A clean checkout of the intended, protected `main` commit with all required checks passing.
- The release tag must match the `version` field in `package.json`. The workflow publishes an OCI image to `ghcr.io/roman-kunitsyn/nestjs-backend-starter`; it does not create a GitHub Release page or upload a source archive.

Check local state and version:

```bash
git status --short
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
node -p 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version'
gh auth status
```

Expected: clean working tree, successful frozen install, the intended semver version (currently `0.0.1`), and an authenticated account. If publishing a new release, change the package version through a reviewed commit and verify the updated lockfile before creating its matching tag.

## Create and publish a version tag

After the version commit has merged and required CI is green, set `VERSION` to that exact package version and create the annotated tag:

```bash
VERSION=0.0.2
test "$(node -p 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version')" = "$VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"
git show --no-patch --decorate "v$VERSION"
git push origin "v$VERSION"
```

Expected: the equality check succeeds, the tag points to the intended merged commit, and the push is accepted by the release-tag ruleset. The push starts `.github/workflows/release.yml` for tags matching `v*.*.*`. If the protected tag rejects the push, ask a repository administrator to use the approved tag creation path; do not force-update or delete a release tag.

Watch the run and record its ID:

```bash
gh run list --repo roman-kunitsyn/nestjs-backend-starter --workflow release.yml --limit 10
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter --log
```

Expected: `quality / Quality and image gates` and `Publish immutable image` both succeed. The publish summary must state version, full source commit, and `sha256:` image digest. Confirm the tag commit equals the run's full `headSha`, and the package version matches the tag without its leading `v`.

## Verify image, digest, SBOM, provenance, and vulnerability scan

Set the exact image and digest from the successful publish run:

```bash
IMAGE=ghcr.io/roman-kunitsyn/nestjs-backend-starter
DIGEST=sha256:REPLACE_WITH_64_HEX_DIGEST
VERSION=0.0.2
gh auth status
docker buildx imagetools inspect "$IMAGE@$DIGEST"
docker buildx imagetools inspect "$IMAGE:$VERSION"
docker buildx imagetools inspect "$IMAGE:sha-SOURCE_COMMIT"
```

Expected: the digest reference resolves, and both version and SHA references point to the same immutable manifest digest. The output should show BuildKit attestation manifests for SBOM and provenance. Confirm the run log includes the successful `Build and publish image with SBOM and provenance` and `Scan published image digest` steps. BuildKit's build record is retained as a workflow artifact for the run; its artifact digest checks the build record download, not the container image digest.

For a machine-readable top-level manifest check:

```bash
docker buildx imagetools inspect --raw "$IMAGE@$DIGEST" > /tmp/release-manifest.json
jq -e '.manifests | any(.annotations["vnd.docker.reference.type"] == "attestation-manifest")' /tmp/release-manifest.json
jq -r '.manifests[] | select(.annotations["vnd.docker.reference.type"] == "attestation-manifest") | [.digest, .annotations["vnd.docker.reference.digest"]] | @tsv' /tmp/release-manifest.json
ATTESTATION_DIGEST="$(jq -r '.manifests[] | select(.annotations["vnd.docker.reference.type"] == "attestation-manifest") | .digest' /tmp/release-manifest.json | head -n 1)"
docker buildx imagetools inspect --raw "$IMAGE@$ATTESTATION_DIGEST" > /tmp/release-attestation.json
jq -e '[.layers[].annotations["in-toto.io/predicate-type"]] | index("https://spdx.dev/Document") != null and index("https://slsa.dev/provenance/v1") != null' /tmp/release-attestation.json
```

Expected: the first command prints `true`; the second lists attestation manifest digests associated with the image; the final command prints `true` when that manifest contains both the SPDX SBOM and SLSA provenance predicates. Review predicate content in the GHCR package/build record and confirm the source repository, commit, and subject digest match the release. Do not treat the presence of an attestation manifest alone as validation of its contents.

The scan's acceptance policy is the workflow setting: Trivy scans the pushed digest for OS and library vulnerabilities at HIGH/CRITICAL severity, ignores findings without fixes, and fails on any remaining match. In the `Publish immutable image` job, manually inspect the complete `Scan published image digest` step and confirm it succeeded for the exact `IMAGE@DIGEST`. A successful step means no findings met that configured blocking policy; it does not mean the image has zero vulnerabilities.

## Dispatch a deployment

The production environment must allow version tags matching `v*.*.*`, require reviewer approval, and have administrator bypass disabled. The staging environment should allow only protected `main`. Use a protected release tag that contains the deployment workflow version you intend to run. Do not move, delete, or recreate the existing `v0.0.1` tag; it points to the original release commit and predates the added release-identity checks. A later release tag can be selected only after that release has been published through the protected release process. GitHub CLI `workflow run --ref` accepts a branch or tag; the workflow must exist on the default branch, and GitHub supplies the selected tag ref and its commit to the `workflow_dispatch` run ([GitHub manual dispatch documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [GitHub CLI reference](https://cli.github.com/manual/gh_workflow_run)). GitHub also requires the workflow to have run at least once before dispatching it against another branch or tag, so use the non-deploying initialization below before the first tag-based production dispatch.

Find the successful tagged release run and copy its exact tag, source SHA, and image digest from the run summary:

```bash
gh run list --repo roman-kunitsyn/nestjs-backend-starter \
  --workflow release.yml --branch "v$VERSION" --limit 10
gh run view "$RELEASE_RUN_ID" --repo roman-kunitsyn/nestjs-backend-starter \
  --json conclusion,headBranch,headSha,url
```

Confirm `conclusion` is `success`, `headBranch` is `v$VERSION`, and `headSha` matches the source commit in the release summary. Set `SOURCE_COMMIT` to that full SHA and `DIGEST` to the exact `sha256:` digest from the same successful run. Verify that both GHCR references resolve to that digest before dispatch:

```bash
IMAGE=ghcr.io/roman-kunitsyn/nestjs-backend-starter
docker buildx imagetools inspect "$IMAGE:$VERSION"
docker buildx imagetools inspect "$IMAGE:sha-$SOURCE_COMMIT"
```

Both references must report the same digest as `DIGEST`; inspect the release run's successful scan and SBOM/provenance record as described above.

For first use after the deploy workflow is merged to the default branch, run the identity-only initialization from protected `main`. It is limited to staging and main, verifies the same tagged release and GHCR digests, does not read deployment credentials, and does not contact a cluster:

```bash
gh workflow run deploy.yml --ref main \
  -f environment=staging \
  -f image_digest="$DIGEST" \
  -f version="$VERSION" \
  -f source_commit="$SOURCE_COMMIT" \
  -f validation_only=true
```

Confirm the run succeeds and its summary says no deployment occurred. Subsequent production dispatches use the protected release tag below with `validation_only` left at its default `false`.

Dispatch production from that same protected release tag:

```bash
gh workflow run deploy.yml --ref "v$VERSION" \
  -f environment=production \
  -f image_digest="$DIGEST" \
  -f version="$VERSION" \
  -f source_commit="$SOURCE_COMMIT"
```

The workflow rejects a production dispatch unless the selected tag matches the version and source commit, a successful release workflow exists for that tag and commit, and both GHCR version and source-SHA references resolve to the requested digest. For staging, use `--ref main` and `-f environment=staging`; the same release and digest checks apply. Approve the production job only after verifying the release identity and target environment. The workflow then validates environment-specific inputs, runs the migration hook before rollout, waits for health and smoke checks, and records the deployment digest.

Manual verification in GitHub:

1. Open the release run and confirm its tag, full source SHA, success conclusion, both jobs, and summary digest.
2. Open the linked package in GitHub Packages and verify the `0.0.1`/version, `sha-<full commit>`, and `latest` tags resolve to the recorded digest. The metadata action in this workflow also generates `latest` for semver tags.
3. Inspect OCI labels `org.opencontainers.image.revision` and `org.opencontainers.image.version`.
4. Inspect SBOM and provenance attachments/predicates and match the commit, repository, and digest.
5. Confirm the Trivy scan step scanned the recorded digest and passed.
6. Deploy only `IMAGE@DIGEST`; deployment and rollback steps are in [Kubernetes operations](kubernetes.md).

## Troubleshooting

- No workflow run: verify `git ls-remote --tags origin "refs/tags/v$VERSION"`, the exact `vMAJOR.MINOR.PATCH` tag, Actions enabled, and that the tag points to a commit containing the release workflow.
- Version mismatch: compare the tag suffix with `package.json`; publish a corrected new version/tag after review. Do not retarget an immutable tag.
- Quality job failed: use `gh run view RUN_ID --log-failed` and follow [GitHub Actions CI and troubleshooting](github-actions.md).
- GHCR push denied: verify the publish job's `packages: write` permission, package linkage/visibility, and workflow access to the package; never put a PAT in workflow YAML.
- Digest inspection denied or not found: run `docker login ghcr.io`, check package visibility/permissions, and copy the digest from the successful run summary without truncation.
- Attestations absent or mismatched: stop deployment; inspect Buildx outputs, run commit and manifest, and package attestations. Rebuild and publish an approved new tag after fixing the workflow; do not claim provenance based only on labels.
- Trivy failed: inspect the exact finding and image digest. Fix or formally resolve through approved vulnerability policy, then publish a new version and repeat the verification.

## Release evidence recorded for v0.0.1

The standalone main CI run [38359105430](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359105430) and tagged release workflow [38359664805](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359664805) completed successfully on 2026-10-13 at commit `460e3e0581e3afd43ad644caef383c9696a32522`. Both release jobs passed, including dependency and exact-digest Trivy scans. The run summary records `sha256:6f87cc59a9aa6ca69ab05fa6599887263d95b31c6a614ef89a036dffc178bf16`. Direct GHCR inspection confirmed that digest resolves to an OCI index and that the published image includes an attestation manifest with SPDX (`https://spdx.dev/Document`) and SLSA provenance (`https://slsa.dev/provenance/v1`) predicates. The build job log records version/source OCI labels. The run also uploaded build record artifact `11794660508` (artifact SHA-256 `5e551173666f44ba46c8e0e37fc2341d5ae8a2d3fd2f540b6fa7f0a87f3d3c8c`). This artifact digest is not the image digest. A GitHub Release page for `v0.0.1` was not found; the versioned GHCR artifact is the release output defined by this repository's workflow.

Hosted workflow evidence: [CI run 38359105430](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359105430) and [tagged release run 38359664805](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359664805) passed. The current deploy workflow is published on the default branch and includes the `validation_only` job. For M021, a successful run must use `--ref main`, `environment=staging`, and `validation_only=true` against this immutable v0.0.1 identity; verify its release/digest checks and summary confirming no deployment occurred.

Hosted validation audit on 2026-10-13: after the operator reported a manual dispatch, the public Actions API query filtered by `event=workflow_dispatch` returned `total_count: 0`. The unfiltered history returned ten `deploy.yml` runs, all triggered by `push`; the latest is [failed run 38374754270](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38374754270) on `main` commit `0aebfd9bb03d896b6b1ecb23339dbe9ded14e3db`. The workflow is now published with `validation_only`, but no dispatch run is observable, so its run ID, URL, job conclusions, v0.0.1 inputs, release/digest check results, and no-deployment summary cannot be verified. The existing successful CI/release evidence and immutable image record remain intact. M021 remains blocked until the run appears in Actions and the validation job succeeds with the deploy job skipped.
