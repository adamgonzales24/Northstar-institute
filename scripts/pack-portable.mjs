import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { packager } from '@electron/packager'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'release')

const ignore = (p) => {
  if (!p || p === '/') return false
  return (
    p.startsWith('/node_modules') ||
    p.startsWith('/src') ||
    p.startsWith('/release') ||
    p.startsWith('/scripts') ||
    p.startsWith('/bin') ||
    p.startsWith('/.git') ||
    p.startsWith('/.grok')
  )
}

const paths = await packager({
  dir: root,
  name: 'NorthstarInstitute',
  executableName: 'northstar',
  platform: process.platform,
  arch: process.arch,
  out,
  overwrite: true,
  asar: true,
  prune: true,
  ignore,
  icon: path.join(root, 'desktop/icon.png'),
})

for (const dir of paths) {
  fs.writeFileSync(path.join(dir, 'portable'), '1\n')
  const data = path.join(dir, 'data')
  fs.mkdirSync(data, { recursive: true })
  fs.writeFileSync(
    path.join(data, 'README.txt'),
    [
      'Northstar Institute — portable student record',
      '',
      'This folder travels with the app. Copy the whole “Northstar Institute-*” directory',
      'to a USB drive or another computer of the SAME OS (Linux → Linux, Windows → Windows).',
      'Then run the northstar executable.',
      '',
      'student.json appears here after you finish onboarding (or import a backup).',
      '',
    ].join('\n')
  )
  fs.writeFileSync(
    path.join(dir, 'HOW-TO-MOVE.txt'),
    [
      'This is a portable copy of Northstar Institute.',
      '',
      'Same computer: double-click “northstar” (Linux) or the app icon.',
      'Another computer: copy this entire folder. Progress is data/student.json.',
      'Browser → desktop: Settings → Export backup JSON, then Import on this app.',
      '',
      'Not an accredited university.',
      '',
    ].join('\n')
  )
  console.log('Portable app:', dir)
}
