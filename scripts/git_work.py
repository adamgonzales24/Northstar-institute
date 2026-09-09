#!/usr/bin/env python3
"""Commit a work-log note (and tracked changes) in the Northstar git repo, then push."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LOG_FILE = REPO / "Notes" / "work-log.md"
SSH_KEY = Path.home() / ".ssh" / "id_ed25519"


def git(args: list[str], *, timeout: int = 60, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.setdefault("HOME", str(Path.home()))
    if SSH_KEY.is_file():
        env["GIT_SSH_COMMAND"] = (
            f"ssh -i {SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
        )
    return subprocess.run(
        ["git", "-C", str(REPO), *args],
        capture_output=True,
        text=True,
        env=env,
        input=input_text,
        timeout=timeout,
    )


def fail(message: str, extra: dict | None = None, code: int = 1) -> int:
    payload = {"ok": False, "error": message}
    if extra:
        payload.update(extra)
    sys.stdout.write(json.dumps(payload) + "\n")
    return code


def github_https(remote: str) -> str | None:
    remote = (remote or "").strip()
    m = re.search(r"github\.com[:/](.+?)(?:\.git)?$", remote)
    if not m:
        return None
    return "https://github.com/" + m.group(1).rstrip("/")


def status() -> int:
    if not (REPO / ".git").exists():
        return fail("This folder is not a git repository.")
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
    head = git(["rev-parse", "--short", "HEAD"])
    porcelain = git(["status", "--porcelain"])
    remote = git(["remote", "get-url", "origin"])
    origin = github_https(remote.stdout if remote.returncode == 0 else "")
    dirty = bool(porcelain.stdout.strip())
    sys.stdout.write(
        json.dumps(
            {
                "ok": True,
                "branch": (branch.stdout or "").strip() or None,
                "head": (head.stdout or "").strip() or None,
                "dirty": dirty,
                "origin": origin,
                "remote": (remote.stdout or "").strip() or None,
            }
        )
        + "\n"
    )
    return 0


def append_log(comment: str, course_id: str, week: str) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    where = course_id or "course"
    if week:
        where += f" week {week}"
    block = f"\n## {stamp} — {where}\n\n{comment.strip()}\n"
    if not LOG_FILE.exists():
        LOG_FILE.write_text("# Work log\n\nNotes recorded from Northstar (desktop or iPad).\n" + block, encoding="utf-8")
    else:
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(block)


def commit(comment: str, course_id: str, week: str) -> int:
    if not (REPO / ".git").exists():
        return fail("This folder is not a git repository.")
    comment = (comment or "").strip()
    if not comment:
        return fail("Write a comment first. That becomes the commit message.")
    if len(comment) > 4000:
        return fail("Comment is too long (max 4000 characters).")

    append_log(comment, course_id, week)
    add = git(["add", "--", str(LOG_FILE.relative_to(REPO))])
    if add.returncode != 0:
        return fail(add.stderr.strip() or "git add failed")
    tracked = git(["add", "-u"])
    if tracked.returncode != 0:
        return fail(tracked.stderr.strip() or "git add -u failed")

    staged = git(["diff", "--cached", "--name-only"])
    if not (staged.stdout or "").strip():
        return fail("Nothing to commit. Make a change, or the work log did not stage.")

    committed = git(["commit", "-F", "-"], input_text=comment + "\n")
    if committed.returncode != 0:
        return fail((committed.stderr or committed.stdout or "git commit failed").strip())

    full = git(["rev-parse", "HEAD"])
    short = git(["rev-parse", "--short", "HEAD"])
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
    hash_full = (full.stdout or "").strip()
    hash_short = (short.stdout or "").strip()
    branch_name = (branch.stdout or "").strip()
    remote = git(["remote", "get-url", "origin"])
    origin = github_https(remote.stdout if remote.returncode == 0 else "")

    pushed = False
    push_error = None
    if remote.returncode == 0 and (remote.stdout or "").strip():
        pushed_run = git(["push", "-u", "origin", "HEAD"], timeout=90)
        if pushed_run.returncode == 0:
            pushed = True
        else:
            push_error = (pushed_run.stderr or pushed_run.stdout or "git push failed").strip()

    url = f"{origin}/commit/{hash_full}" if origin and hash_full else None
    sys.stdout.write(
        json.dumps(
            {
                "ok": True,
                "hash": hash_full,
                "short": hash_short,
                "branch": branch_name,
                "url": url,
                "pushed": pushed,
                "pushError": push_error,
                "comment": comment,
            }
        )
        + "\n"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status")
    c = sub.add_parser("commit")
    c.add_argument("--comment", required=True)
    c.add_argument("--course", default="")
    c.add_argument("--week", default="")
    args = parser.parse_args()
    try:
        if args.cmd == "status":
            return status()
        return commit(args.comment, args.course, args.week)
    except subprocess.TimeoutExpired:
        return fail("Git timed out (often a stuck SSH push).")
    except Exception as err:
        return fail(str(err))


if __name__ == "__main__":
    raise SystemExit(main())
