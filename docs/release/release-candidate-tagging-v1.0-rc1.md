# ATLAS DataGob · Release candidate tagging plan v1.0-rc1

## Purpose

This document defines how to create and validate the release candidate tag for ATLAS DataGob.

The recommended tag is:

```text
atlas-datagob-v1.0-rc1
```

This tag must point to the final `main` commit approved for the controlled production pilot.

## Meaning

```text
atlas-datagob = product name
v1.0          = first stable release candidate baseline
rc1           = release candidate 1
```

A release candidate tag freezes a precise version of the codebase for pilot execution. Future changes in `main` must not alter what was used during the controlled pilot.

## When to create the tag

Create the tag only after:

1. Sprint 47 PR is approved.
2. Sprint 47 PR is merged into `main`.
3. `main` is pulled locally.
4. CI is green.
5. The release candidate documents and handoff package are present in `main`.

## Tag creation commands

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main

git tag -a atlas-datagob-v1.0-rc1 -m "ATLAS DataGob v1.0 Release Candidate 1"
git push origin atlas-datagob-v1.0-rc1
```

## Tag validation commands

```bash
git fetch --tags
git show atlas-datagob-v1.0-rc1 --stat
git rev-list -n 1 atlas-datagob-v1.0-rc1
git rev-parse main
```

The tag commit should match the approved `main` commit intended for the pilot.

## Pilot traceability statement

After the tag is created, pilot evidence should reference this statement:

```text
The controlled pilot was executed using ATLAS DataGob release candidate atlas-datagob-v1.0-rc1.
```

## Tag correction policy

The tag should be treated as immutable.

If a critical issue is found after tagging:

1. Do not move the existing tag unless explicitly approved.
2. Create a fix branch.
3. Merge the fix through PR and CI.
4. Create a new release candidate tag, for example `atlas-datagob-v1.0-rc2`.

## Recommended release evidence

Capture the following after tag creation:

```bash
git show atlas-datagob-v1.0-rc1 --stat > evidence_release_candidate_tag.txt
git rev-list -n 1 atlas-datagob-v1.0-rc1 >> evidence_release_candidate_tag.txt
```

Store the resulting evidence with the pilot execution package.

## GO criteria

Tag creation is considered successful when:

- The tag exists in the remote repository.
- The tag points to the approved `main` commit.
- The tag name matches `atlas-datagob-v1.0-rc1`.
- The tag is referenced in pilot deployment evidence.

## NO-GO criteria

Do not proceed with pilot deployment when:

- The tag does not exist remotely.
- The tag points to an unexpected commit.
- Sprint 47 is not merged.
- CI is not green.
- Release candidate or handoff documents are missing from `main`.
