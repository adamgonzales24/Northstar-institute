import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = os.homedir()
const appsDir = path.join(home, '.local/share/applications')
const iconBase = path.join(home, '.local/share/icons/hicolor')
const launcher = path.join(root, 'bin/northstar')
const svgSrc = path.join(root, 'public/favicon.svg')
const pngSrc = path.join(root, 'desktop/icon.png')

fs.chmodSync(launcher, 0o755)
fs.mkdirSync(appsDir, { recursive: true })

function installPng(size) {
  const dir = path.join(iconBase, `${size}x${size}`, 'apps')
  fs.mkdirSync(dir, { recursive: true })
  const dest = path.join(dir, 'northstar-institute.png')
  const rsvg = spawnSync('rsvg-convert', ['-w', String(size), '-h', String(size), svgSrc, '-o', dest], { encoding: 'utf8' })
  if (rsvg.status !== 0) {
    if (fs.existsSync(pngSrc)) fs.copyFileSync(pngSrc, dest)
  }
}

installPng(128)
installPng(256)
installPng(512)

const scalable = path.join(iconBase, 'scalable/apps')
fs.mkdirSync(scalable, { recursive: true })
fs.copyFileSync(svgSrc, path.join(scalable, 'northstar-institute.svg'))

const desktopPath = path.join(appsDir, 'northstar-institute.desktop')
const body = `[Desktop Entry]
Type=Application
Version=1.0
Name=Northstar Institute
GenericName=Self-directed CS degree
Comment=B.S. Software Engineering & Computer Science — self-directed LMS (not accredited)
Exec=${launcher}
Icon=northstar-institute
Terminal=false
Categories=Education;ComputerScience;
Keywords=LMS;computer science;degree;northstar;
StartupNotify=true
StartupWMClass=Northstar Institute
`
fs.writeFileSync(desktopPath, body)
fs.chmodSync(desktopPath, 0o755)

spawnSync('update-desktop-database', [appsDir], { stdio: 'ignore' })
spawnSync('gtk-update-icon-cache', ['-f', '-t', iconBase], { stdio: 'ignore' })

const bootLauncher = path.join(root, 'bin/northstar-bootcamp')
fs.chmodSync(bootLauncher, 0o755)
const bootDesktop = path.join(appsDir, 'northstar-bootcamp.desktop')
fs.writeFileSync(
  bootDesktop,
  `[Desktop Entry]
Type=Application
Version=1.0
Name=Northstar Bootcamp
GenericName=Systems and backend bootcamp
Comment=24-week systems and backend path (separate from the B.S. app)
Exec=${bootLauncher}
Icon=northstar-institute
Terminal=false
Categories=Education;ComputerScience;
Keywords=bootcamp;software engineering;northstar;
StartupNotify=true
StartupWMClass=Northstar Bootcamp
`
)
fs.chmodSync(bootDesktop, 0o755)

console.log('Installed launcher:', desktopPath)
console.log('Installed bootcamp launcher:', bootDesktop)
console.log('Start from the app menu as “Northstar Institute” or “Northstar Bootcamp”, or run:')
console.log(' ', launcher)
console.log(' ', bootLauncher)
