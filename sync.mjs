// sync.mjs — копирует из приватного волта в content/ ТОЛЬКО заметки с `publish: true`.
// Запуск:  node sync.mjs
//
// Что делает:
//   1. Рекурсивно обходит волт, пропуская служебные и заведомо личные папки.
//   2. Берёт .md-файлы, у которых во frontmatter стоит `publish: true`.
//   3. Копирует их в ./content, сохраняя структуру папок.
//   4. Подтягивает картинки/вложения, на которые ссылаются опубликованные заметки.
//   5. Ничего не публикующее — не трогает. content/ перед каждым запуском очищается.

import fs from "node:fs"
import path from "node:path"

// --- Настройки -------------------------------------------------------------
const VAULT = "C:/Users/rm952/OneDrive/Documents/Zettelkasten/Zettelkasten"
const CONTENT = path.resolve("./content")

// Папки, которые никогда не сканируем (личное + служебное).
const IGNORE_DIRS = new Set([
  ".git", ".obsidian", ".trash", ".idea", ".vs",
  "Templates", "Daily",
])
// ---------------------------------------------------------------------------

/** Рекурсивно собрать все файлы волта (кроме игнорируемых папок). */
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), acc)
    } else {
      acc.push(path.join(dir, entry.name))
    }
  }
  return acc
}

/** Есть ли во frontmatter `publish: true`. */
function isPublished(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return false
  return /^\s*publish\s*:\s*true\s*$/im.test(m[1])
}

/** Достать имена вложений, на которые ссылается заметка. */
function extractRefs(text) {
  const refs = new Set()
  // Obsidian-эмбеды: ![[файл]] или ![[файл|подпись]] или ![[файл#заголовок]]
  for (const m of text.matchAll(/!\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    refs.add(m[1].trim())
  }
  // Markdown-картинки: ![alt](path)
  for (const m of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    let p = m[1].trim()
    if (/^https?:\/\//i.test(p)) continue // внешние ссылки пропускаем
    refs.add(decodeURIComponent(p.split("#")[0].split("?")[0]))
  }
  return refs
}

function rmContent() {
  if (fs.existsSync(CONTENT)) fs.rmSync(CONTENT, { recursive: true, force: true })
  fs.mkdirSync(CONTENT, { recursive: true })
}

function copyTo(absSrc, relPath) {
  const dest = path.join(CONTENT, relPath)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(absSrc, dest)
}

// --- Основной проход -------------------------------------------------------
const allFiles = walk(VAULT)

// Индекс всех файлов по имени (для разрешения вложений по basename, как в Obsidian).
const byBasename = new Map()
for (const f of allFiles) {
  const base = path.basename(f)
  if (!byBasename.has(base)) byBasename.set(base, f)
}

rmContent()

const publishedNotes = []
for (const f of allFiles) {
  if (!f.toLowerCase().endsWith(".md")) continue
  const text = fs.readFileSync(f, "utf8")
  if (isPublished(text)) publishedNotes.push({ abs: f, text })
}

// Копируем заметки + собираем вложения.
const wantAttachments = new Set()
const missingTransclusions = []
for (const { abs, text } of publishedNotes) {
  const rel = path.relative(VAULT, abs)
  copyTo(abs, rel)
  for (const ref of extractRefs(text)) {
    const base = path.basename(ref)
    const src = byBasename.get(base) || byBasename.get(ref)
    if (!src) continue
    if (src.toLowerCase().endsWith(".md")) {
      // Эмбед другой заметки — она тоже должна быть опубликована.
      if (!publishedNotes.some((n) => n.abs === src)) missingTransclusions.push({ from: rel, ref })
      continue
    }
    wantAttachments.add(src)
  }
}

for (const src of wantAttachments) {
  copyTo(src, path.relative(VAULT, src))
}

// Гарантируем главную страницу.
if (!fs.existsSync(path.join(CONTENT, "index.md"))) {
  fs.writeFileSync(
    path.join(CONTENT, "index.md"),
    `---\ntitle: Заметки ruslooob\npublish: true\n---\n\nДобро пожаловать. Это публичная часть моих заметок.\n`,
  )
}

// --- Отчёт -----------------------------------------------------------------
console.log(`\n✅ Опубликовано заметок: ${publishedNotes.length}`)
console.log(`🖼  Скопировано вложений: ${wantAttachments.size}`)
for (const n of publishedNotes) console.log(`   • ${path.relative(VAULT, n.abs)}`)
if (missingTransclusions.length) {
  console.log(`\n⚠️  Опубликованные заметки ссылаются (эмбедом) на НЕопубликованные:`)
  for (const m of missingTransclusions) console.log(`   • ${m.from}  →  ${m.ref}`)
}
if (!publishedNotes.length) {
  console.log(`\n⚠️  Ни одной заметки с "publish: true" не найдено. Добавь его во frontmatter.`)
}
