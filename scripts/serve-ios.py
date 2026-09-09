#!/usr/bin/env python3
"""Serve the Northstar production build on the LAN so iPhone/iPad Safari can open it."""

from __future__ import annotations

import argparse
import http.server
import json
import os
import re
import socket
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from functools import partial
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
MAX_RECORD_BYTES = 5 * 1024 * 1024
MAX_READING_BYTES = 40 * 1024 * 1024
MAX_AI_BODY = 2 * 1024 * 1024
ID_OK = re.compile(r"^[A-Za-z0-9._-]+$")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("NORTHSTAR_AI_MODEL", "qwen3.8:27b").strip()
RECORD_LOCK = threading.Lock()


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    record_path: Path | None = None
    bootcamp_record_path: Path | None = None
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".wasm": "application/wasm",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/sync-config":
            boot = self._is_bootcamp_request()
            rec = self.bootcamp_record_path if boot else self.record_path
            self._send_json(
                {
                    "enabled": bool(rec),
                    "record": "/api/bootcamp/student.json" if boot else "/api/student.json",
                    "meta": "/api/bootcamp/student-meta" if boot else "/api/student-meta",
                    "readings": "/api/readings",
                }
            )
            return
        if path in ("/api/student-meta", "/api/bootcamp/student-meta"):
            self._send_meta(path.startswith("/api/bootcamp"))
            return
        if path in ("/api/student.json", "/api/bootcamp/student.json"):
            self._send_record(path.startswith("/api/bootcamp"))
            return
        if path == "/api/ai/status":
            self._ai_status()
            return
        reading = self._reading_parts(path)
        if reading:
            self._send_reading_file(*reading)
            return
        if self._is_spa_route():
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/ai/chat":
            self._ai_chat()
            return
        if path == "/api/ai/grade":
            self._ai_grade()
            return
        self.send_error(404, "Not found")

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        reading = self._reading_parts(path)
        if reading:
            self._write_reading_file(*reading)
            return
        if path not in ("/api/student.json", "/api/bootcamp/student.json"):
            self.send_error(404, "Not found")
            return
        target = self.bootcamp_record_path if path.startswith("/api/bootcamp") else self.record_path
        if not target:
            self.send_error(404, "No USB student.json")
            return
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > MAX_RECORD_BYTES:
            self.send_error(400, "Bad record size")
            return
        raw = self.rfile.read(length)
        try:
            parsed = json.loads(raw.decode("utf-8"))
            if not isinstance(parsed, dict):
                raise ValueError("not an object")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            self.send_error(400, "Not JSON")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(parsed, indent=2)
        with RECORD_LOCK:
            fd, tmp_name = tempfile.mkstemp(prefix="student.json.", suffix=".tmp", dir=str(target.parent))
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as tmp:
                    tmp.write(payload)
                os.replace(tmp_name, target)
            except Exception:
                try:
                    os.unlink(tmp_name)
                except OSError:
                    pass
                raise
        self._send_json({"ok": True})

    def _is_bootcamp_request(self) -> bool:
        q = parse_qs(urlparse(self.path).query)
        return (q.get("program") or [""])[0] == "bootcamp"

    def _send_record(self, bootcamp: bool = False) -> None:
        path = self.bootcamp_record_path if bootcamp else self.record_path
        if not path or not path.is_file():
            self.send_error(404, "No USB student.json")
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_meta(self, bootcamp: bool = False) -> None:
        path = self.bootcamp_record_path if bootcamp else self.record_path
        if not path or not path.is_file():
            self.send_error(404, "No USB student.json")
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self.send_error(500, "Could not read student.json")
            return
        profile = data.get("profile") or {}
        self._send_json(
            {
                "onboarded": bool(data.get("onboarded")),
                "name": profile.get("name") or "",
                "lastRoute": data.get("lastRoute"),
                "lastCourseId": data.get("lastCourseId"),
                "lastModule": data.get("lastModule"),
            }
        )

    def do_DELETE(self) -> None:
        reading = self._reading_parts(urlparse(self.path).path)
        if not reading:
            self.send_error(404, "Not found")
            return
        course_id, item_id = reading
        base = self._reading_path(course_id, item_id)
        if base is None:
            self.send_error(404, "No USB data folder")
            return
        for p in (base, Path(str(base) + ".json")):
            try:
                p.unlink()
            except FileNotFoundError:
                pass
        self._send_json({"ok": True})

    def _reading_parts(self, path: str) -> tuple[str, str] | None:
        parts = path.strip("/").split("/")
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "readings":
            return None
        course_id, item_id = parts[2], parts[3]
        if not ID_OK.match(course_id) or not ID_OK.match(item_id):
            return None
        return course_id, item_id

    def _reading_path(self, course_id: str, item_id: str) -> Path | None:
        if not self.record_path:
            return None
        folder = self.record_path.parent / "readings" / course_id
        folder.mkdir(parents=True, exist_ok=True)
        return folder / item_id

    def _send_reading_file(self, course_id: str, item_id: str) -> None:
        base = self._reading_path(course_id, item_id)
        if base is None or not base.is_file():
            self.send_error(404, "Reading not found")
            return
        mime = "application/octet-stream"
        meta_file = Path(str(base) + ".json")
        if meta_file.is_file():
            try:
                mime = json.loads(meta_file.read_text(encoding="utf-8")).get("mime") or mime
            except json.JSONDecodeError:
                pass
        body = base.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _write_reading_file(self, course_id: str, item_id: str) -> None:
        base = self._reading_path(course_id, item_id)
        if base is None:
            self.send_error(404, "No USB data folder")
            return
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > MAX_READING_BYTES:
            self.send_error(400, "Bad file size")
            return
        raw = self.rfile.read(length)
        base.write_bytes(raw)
        title = unquote(self.headers.get("X-Northstar-Title") or item_id)
        name = unquote(self.headers.get("X-Northstar-Name") or title)
        meta = {
            "id": item_id,
            "title": title,
            "name": name,
            "mime": self.headers.get("Content-Type") or "application/octet-stream",
            "size": length,
        }
        Path(str(base) + ".json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
        self._send_json({"ok": True, "id": item_id})

    def _send_json(self, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict | None:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > MAX_AI_BODY:
            self.send_error(400, "Bad body size")
            return None
        raw = self.rfile.read(length)
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400, "Not JSON")
            return None
        if not isinstance(parsed, dict):
            self.send_error(400, "Not an object")
            return None
        return parsed

    def _ai_status(self) -> None:
        info = ollama_status()
        self._send_json(info)

    def _ai_chat(self) -> None:
        payload = self._read_json_body()
        if payload is None:
            return
        messages = payload.get("messages") or []
        if not isinstance(messages, list) or not messages:
            self.send_error(400, "messages required")
            return
        context = payload.get("context") if isinstance(payload.get("context"), dict) else {}
        model = pick_ollama_model(payload.get("model") if isinstance(payload, dict) else None)
        if not model:
            self.send_error(503, "Local AI is not running")
            return
        ollama_messages = [{"role": "system", "content": professor_system_prompt(context)}]
        for m in messages[-24:]:
            if not isinstance(m, dict):
                continue
            role = m.get("role")
            content = str(m.get("content") or "")
            if role in ("user", "assistant") and content:
                ollama_messages.append({"role": role, "content": content})
        try:
            req = urllib.request.Request(
                OLLAMA_HOST + "/api/chat",
                data=json.dumps({"model": model, "messages": ollama_messages, "stream": True}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()
                for raw_line in resp:
                    line = raw_line.decode("utf-8", "replace").strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    delta = ((data.get("message") or {}).get("content")) or ""
                    if delta:
                        self.wfile.write(b"data: " + json.dumps({"delta": delta}).encode("utf-8") + b"\n\n")
                        self.wfile.flush()
                    if data.get("done"):
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                        break
        except urllib.error.HTTPError as err:
            self.send_error(502, f"Ollama HTTP {err.code}")
        except OSError as err:
            self.send_error(503, f"Ollama unreachable: {err}")

    def _ai_grade(self) -> None:
        payload = self._read_json_body()
        if payload is None:
            return
        model = pick_ollama_model(payload.get("model"))
        if not model:
            self._send_json({"error": "Local AI is not running. Start Ollama on this computer."})
            return
        kind = payload.get("kind") or "assignment"
        try:
            text = ollama_generate(model, grade_prompt(kind, payload), fmt="json")
            result = parse_json_object(text)
        except Exception as err:
            self.send_error(502, str(err)[:200])
            return
        self._send_json(result)

    def _is_spa_route(self) -> bool:
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            return False
        rel = path.lstrip("/")
        candidate = Path(self.directory) / rel
        if candidate.is_file():
            return False
        if candidate.is_dir() and (candidate / "index.html").is_file():
            return False
        if "." in Path(rel).name:
            return False
        return True

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def ollama_status() -> dict:
    try:
        with urllib.request.urlopen(OLLAMA_HOST + "/api/tags", timeout=3) as resp:
            tags = json.loads(resp.read().decode("utf-8"))
    except OSError as err:
        return {"available": False, "model": None, "error": f"Ollama is not reachable at {OLLAMA_HOST} ({err})"}
    models = [m.get("name") for m in (tags.get("models") or []) if m.get("name")]
    model = pick_from_list(models, OLLAMA_MODEL)
    if not model:
        return {"available": False, "model": None, "error": "Ollama is running but has no models pulled."}
    return {"available": True, "model": model, "models": models}


def pick_from_list(models: list[str], preferred: str | None) -> str | None:
    if preferred and preferred in models:
        return preferred
    for name in models:
        if name.startswith("qwen3.8"):
            return name
    return models[0] if models else None


def pick_ollama_model(requested) -> str | None:
    info = ollama_status()
    models = info.get("models") or []
    if requested and str(requested) in models:
        return str(requested)
    return info.get("model")


def ollama_generate(model: str, prompt: str, fmt: str | None = None) -> str:
    body = {"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}}
    if fmt:
        body["format"] = fmt
    req = urllib.request.Request(
        OLLAMA_HOST + "/api/generate",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data.get("response") or "")


def parse_json_object(text: str) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("Model did not return JSON")
    parsed = json.loads(raw[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("JSON was not an object")
    return parsed


def professor_system_prompt(context: dict) -> str:
    name = context.get("student") or "the student"
    bits = [
        "You are Prof. North, founding professor at Northstar Institute.",
        "Voice: demanding but kind. Short sentences. No filler.",
        "You are a tutor. Ask questions. Do not write the student's assignment for them.",
        "You may explain a concept, sketch an approach, or review an outline.",
        "If they paste work, critique it against the prompt and rubric. Name what is missing.",
        "Never invent library APIs. If you are unsure, say so and ask them to check the docs.",
        f"The student's name is {name}.",
    ]
    if context.get("course"):
        bits.append(f"Current course: {context['course']}.")
    if context.get("week"):
        bits.append(f"Current week: {context['week']}.")
    if context.get("item"):
        bits.append(f"Current graded item: {context['item']}.")
    if context.get("prompt"):
        bits.append("Assignment prompt:\n" + str(context["prompt"])[:2500])
    return "\n".join(bits)


def grade_prompt(kind: str, payload: dict) -> str:
    if kind == "quiz":
        questions = payload.get("questions") or []
        lines = [
            "Grade these short-answer quiz responses. Return JSON only with this shape:",
            '{"details":[{"index":0,"ok":true,"earned":2,"comment":"why"}],"feedback":"one paragraph"}',
            "Be fair. Award partial credit when the idea is right but wording is messy.",
            "Use the provided answer key as the target, not a nitpick on phrasing.",
        ]
        for q in questions:
            lines.append(
                f"Q{q.get('index')}: ({q.get('points')} pts) {q.get('prompt')}\n"
                f"Key: {q.get('key')}\n"
                f"Note: {q.get('explanation')}\n"
                f"Student: {q.get('student')}"
            )
        return "\n\n".join(lines)
    course = payload.get("course") or {}
    item = payload.get("item") or {}
    work = payload.get("work") or {}
    rubric = item.get("rubric") or []
    rubric_txt = "\n".join(
        f"- {r.get('criterion')} ({r.get('points')} pts). Excellent: {r.get('excellent')} Adequate: {r.get('adequate')} Poor: {r.get('poor')}"
        for r in rubric
    ) or f"- Whole prompt ({item.get('points')} pts)"
    return f"""You are Prof. North grading a Northstar Institute assignment. Return JSON only:
{{
  "scores": [{{"criterion":"name","points":0,"max":0,"comment":"one sentence"}}],
  "total": 0,
  "letter": "B",
  "feedback": "one or two paragraphs. What worked, what is missing, what to fix.",
  "questions": ["oral-defense question 1", "question 2", "question 3"]
}}
Be a real grader. Do not give full points for a thin submission. Empty work is a zero.
Score every rubric row. total is the sum of points, max {item.get("points")}.
Also include 3 follow-up questions the student must be able to answer out loud.

Course: {course.get("code")} {course.get("title")}
Item: {item.get("title")} ({item.get("points")} points)
Prompt:
{item.get("prompt")}

Rubric:
{rubric_txt}

Student GitHub: {work.get("githubUrl") or "(none)"}
Commit: {work.get("commit") or "(none)"}
Student work:
{str(work.get("text") or "(empty)")[:8000]}
"""


def find_student_json() -> Path | None:
    usb = ROOT.parent
    candidates = [
        usb / "NorthstarInstitute-linux-x64" / "data" / "student.json",
        Path.home() / "Documents" / "Northstar Institute" / "student.json",
        ROOT / "data" / "student.json",
    ]
    found = [p for p in candidates if p.is_file()]
    if not found:
        return None
    return max(found, key=lambda p: p.stat().st_mtime)


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("1.1.1.1", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def ufw_allows(port: int) -> bool | None:
    """Return True/False if we can tell, or None if UFW is off/unknown."""
    try:
        conf = Path("/etc/ufw/ufw.conf").read_text()
    except OSError:
        return None
    if not re.search(r"^ENABLED=yes", conf, re.M):
        return None
    try:
        default = Path("/etc/default/ufw").read_text()
    except OSError:
        default = 'DEFAULT_INPUT_POLICY="DROP"'
    drop = 'DEFAULT_INPUT_POLICY="DROP"' in default or "DEFAULT_INPUT_POLICY=DROP" in default
    if not drop:
        return True
    try:
        rules = Path("/etc/ufw/user.rules").read_text()
    except OSError:
        return False
    if re.search(rf"--dport {port}\b", rules):
        return True
    for match in re.finditer(r"--dports (\d+):(\d+)", rules):
        if int(match.group(1)) <= port <= int(match.group(2)):
            return True
    return False


def pick_port(requested: int) -> tuple[int, str | None]:
    allowed = ufw_allows(requested)
    if allowed is not False:
        return requested, None
    for candidate in range(1750, 1765):
        if ufw_allows(candidate):
            return candidate, (
                f"This computer's firewall (UFW) is dropping port {requested}, which is why "
                f"the iPad could not connect. Serving on port {candidate} instead "
                f"(already allowed for KDE Connect). To use {requested} later, run:\n"
                f"  sudo ufw allow {requested}/tcp comment 'Northstar iOS'"
            )
    return requested, (
        f"UFW is enabled and likely blocking port {requested}. "
        f"On this Linux machine run:  sudo ufw allow {requested}/tcp"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve Northstar for iPhone/iPad on this Wi-Fi.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("NORTHSTAR_IOS_PORT", "8787")))
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    if not (DIST / "index.html").is_file():
        print("No production build at", DIST, file=sys.stderr)
        print("From northstar-institute run:  npm run build", file=sys.stderr)
        return 1

    port, warning = pick_port(args.port)
    args.port = port
    ip = lan_ip()
    record = find_student_json()
    SpaHandler.record_path = record
    SpaHandler.bootcamp_record_path = (record.parent / "bootcamp-student.json") if record else (Path.home() / "Documents" / "Northstar Bootcamp" / "student.json")
    handler = partial(SpaHandler, directory=str(DIST))
    try:
        server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as err:
        print(f"Could not bind {args.host}:{args.port}: {err}", file=sys.stderr)
        return 1
    print()
    print("Northstar Institute — iPhone / iPad")
    print("===================================")
    if warning:
        print(warning)
        print()
    print(f"On this Linux machine:  http://127.0.0.1:{args.port}")
    print(f"On iPhone or iPad:      http://{ip}:{args.port}")
    ai = ollama_status()
    if ai.get("available"):
        print(f"Local AI:               {ai['model']} at {OLLAMA_HOST}")
    else:
        print(f"Local AI:               offline — {ai.get('error') or 'start ollama serve'}")
    if record:
        print(f"USB record:             {record}")
        print("The iPad will load this student.json and write back to it while this server runs.")
    else:
        print("USB record:             not found (iPad will start empty until you import JSON)")
    print()
    print("1. iPad/iPhone on the same Wi-Fi as this computer (not cellular).")
    print("2. Open the iPad URL in Safari (not Chrome). Type http:// not https://")
    print("3. Tap Share → Add to Home Screen → Add.")
    print("4. Open the Northstar icon. It runs full-screen.")
    print()
    print("Ctrl+C stops the server.")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
