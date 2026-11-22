#!/usr/bin/env bash

set -euo pipefail

role="${1:-}"
issue="${2:-}"
slug="${3:-}"

if [[ -z "$role" || -z "$issue" ]]; then
  echo "사용법: bash scripts/prepare-agent-worktree.sh <planner|frontend|backend|qa> <이슈번호> [slug]" >&2
  exit 1
fi

issue="${issue#\#}"

if [[ ! "$issue" =~ ^[0-9]+$ ]]; then
  echo "이슈 번호는 숫자여야 합니다: $issue" >&2
  exit 1
fi

case "$role" in
  planner) branch_prefix="chore/planner-" ;;
  frontend) branch_prefix="feat/frontend-" ;;
  backend) branch_prefix="feat/backend-" ;;
  qa) branch_prefix="chore/qa-" ;;
  *) echo "지원하지 않는 역할입니다: $role" >&2; exit 1 ;;
esac

if [[ -z "$slug" ]]; then
  slug="issue-$issue"
fi

if [[ ! "$slug" =~ ^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)?$ ]]; then
  echo "slug은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다: $slug" >&2
  exit 1
fi

repo_root="$(git worktree list --porcelain | awk 'NR == 1 { print $2; exit }')"
if [[ -z "$repo_root" ]]; then
  echo "저장소 루트를 찾을 수 없습니다." >&2
  exit 1
fi

cd "$repo_root"
git fetch origin >&2

worktree_path="$repo_root/.worktrees/$role/$slug"
branch="${branch_prefix}${slug}"

if [[ -e "$worktree_path" ]]; then
  if [[ ! -d "$worktree_path/.git" && ! -f "$worktree_path/.git" ]]; then
    echo "워크트리 경로가 이미 존재하지만 Git 워크트리가 아닙니다: $worktree_path" >&2
    exit 1
  fi

  current_branch="$(git -C "$worktree_path" branch --show-current)"
  if [[ "$current_branch" != "$branch" ]]; then
    echo "기존 워크트리의 브랜치가 예상과 다릅니다: $current_branch (예상: $branch)" >&2
    exit 1
  fi
else
  mkdir -p "$(dirname "$worktree_path")"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git worktree add "$worktree_path" "$branch" >&2
  elif git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    git worktree add "$worktree_path" -b "$branch" "origin/$branch" >&2
  else
    git worktree add "$worktree_path" -b "$branch" origin/main >&2
  fi
fi

printf '%s\n' "$worktree_path"
