# Northstar Institute

**B.S. Software Engineering & Computer Science — Self-Directed**

A single-user Canvas-style LMS that runs entirely in the browser. Progress is stored in `localStorage`, with JSON import/export so you can close the tab, change machines, and pick up exactly where you left off.

## Desktop app (click to open)

This is the usual way to use Northstar on your computer. Progress is a JSON file, not a server account.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd /home/adam/northstar-institute
npm install
npm run desktop:install
```

Then open **Northstar Institute** from the app menu (or run `./bin/northstar`). It restores the last page you were on.

Your record lives at:

`~/Documents/Northstar Institute/student.json`

Copy that one file to another computer (USB, email to yourself, Nextcloud). On the new machine, put it in the same folder or use **Settings → Import backup JSON**.

To carry the whole app without installing Node on the destination (same OS only):

```bash
npm run desktop:pack
```

That writes a portable folder under `release/`. Copy the folder; run `northstar` inside it. Progress is `data/student.json` in that folder.

Windows or macOS needs a pack built **on that OS** (`npm run desktop:pack` there). The JSON file itself is cross-platform.

## iPhone and iPad (Home Screen app)

Apple will not let a Linux machine compile a native App Store binary. Northstar is already a web app inside Electron, so the working path is the same UI as an **installable Home Screen app** (a PWA). It looks like an app: own icon, full screen, no Safari chrome.

**Use it today from this Linux box (same Wi-Fi):**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd northstar-institute
npm run ios
```

Or `./bin/start-ios`. The terminal prints a URL like `http://192.168.x.x:8787`.

1. iPhone or iPad on the **same Wi-Fi**
2. Open that URL in **Safari** (not Chrome)
3. Share → **Add to Home Screen** → Add
4. Open the Northstar icon

While `npm run ios` is running, the iPad **loads and writes** the USB file `NorthstarInstitute-linux-x64/data/student.json` — the same record the Linux desktop app uses. If the iPad started empty, use **Settings → Load USB progress** or pull-to-refresh the page.

Close the Linux desktop window while you study on the iPad (and vice versa) so they do not overwrite each other.

A TP-Link Dynamic DNS name (`something.tplinkdns.com`) only helps **away from home**, and only after you add a router port-forward to this PC **and** `sudo ufw allow <port>/tcp`. On the home Wi-Fi, use the LAN URL. Hairpin NAT often makes the public DNS name fail from inside the house. There is no HTTPS certificate on that hostname unless you add one.

The computer must keep serving while you use the LAN URL.

**What a true App Store / TestFlight app would take (later, not this machine):**

- A Mac with Xcode (or a cloud Mac)
- An Apple ID; a paid [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year) to keep it on a device longer than a week
- Wrap this same Vite build with Capacitor (`@capacitor/ios`) and sign an `.ipa`

That is a packaging step, not a rewrite. The Linux USB app stays as it is.

## Browser (dev)

Node 22+ (a local copy lives at `~/.local/node` on this machine):

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd northstar-institute
npm install
npm run dev
```

Open http://127.0.0.1:5173

Optional: http://127.0.0.1:5173/preview.html loads a sample student (Ada, Fall 2026 in progress) so the dashboard is not empty. **Settings → Start fresh** returns you to placement.

```bash
npm run build    # production bundle
npm run preview  # serve the build
npm run smoke    # catalog + scheduling + grade engine checks
```

## What you get

- **43-course catalog**, 124 semester hours (plus MATH 099 if placement requires it): gen-ed, math/science, CS core, SE concentration, six electives (pick 4), two-course capstone
- Placement quiz (programming + math) → skip/add precalculus; Programming I vs a later Java start
- 15-week modules, assignments with rubrics, auto-gradable quizzes, gradebook, unofficial transcript
- Degree audit and 5–7 year sample plans with **fall, winter, spring, and summer**
- Due dates generated from your start date (default **Monday 7 September 2026**)
- Life Happens: shift remaining dues by 1–2 weeks
- Portfolio spine and interview language
- Local AI tutor (Ollama) for grading and questions
- Due-date calendar export and device reminders
- CS-only mode (with a warning)

Materials default to free paths (MIT OCW, CS50, Nand2Tetris, OSTEP, OpenStax, PhET, MDN, …) plus O’Reilly titles when a textbook is the right tool. Paid certificates and exam vouchers appear only on **Paid option — ask student first** cards.
