#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_COMMITS = 1000
const OUTPUT = path.join(__dirname, '..', 'public', 'work-history.json')

const TYPE_LABEL = {
  feat: '기능',
  fix: '버그수정',
  refactor: '리팩토링',
  docs: '문서',
  test: '테스트',
  chore: '기타',
  perf: '성능',
  ci: 'CI',
  style: '스타일',
  audit: '감사',
}

const SEP = '\u001f' // unit separator
const RSEP = '\u001e' // record separator

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
}

function parseSubject(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/)
  if (!m) return { type: 'etc', scope: null, title: subject }
  return { type: m[1].toLowerCase(), scope: m[2] || null, title: m[3] }
}

function main() {
  let commits = []
  try {
    const format = ['%H', '%h', '%ad', '%aI', '%an', '%s', '%b'].join(SEP) + RSEP
    const raw = run(
      `git log -n ${MAX_COMMITS} --date=format:"%Y-%m-%d %H:%M" --pretty=format:"${format}" --no-merges`
    )
    const records = raw.split(RSEP).map((r) => r.trim()).filter(Boolean)

    commits = records.map((rec) => {
      const [fullHash, hash, date, iso, author, subject, body] = rec.split(SEP)
      const { type, scope, title } = parseSubject(subject || '')
      let stats = { files: 0, insertions: 0, deletions: 0 }
      let files = []
      try {
        const shortstat = run(`git show --shortstat --pretty=format: ${fullHash}`).trim()
        const sm = shortstat.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/)
        if (sm) {
          stats = {
            files: Number(sm[1]) || 0,
            insertions: Number(sm[2]) || 0,
            deletions: Number(sm[3]) || 0,
          }
        }
        const nameOnly = run(`git show --name-only --pretty=format: ${fullHash}`)
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        files = nameOnly.slice(0, 30)
      } catch {}
      return {
        hash,
        fullHash,
        date: date.split(' ')[0],
        time: date.split(' ')[1] || '',
        iso,
        author,
        subject,
        body: (body || '').trim(),
        type,
        typeLabel: TYPE_LABEL[type] || type,
        scope,
        title,
        stats,
        files,
      }
    })
  } catch (err) {
    console.warn('[work-history] git log failed:', err.message)
  }

  const byDate = new Map()
  for (const c of commits) {
    if (!byDate.has(c.date)) byDate.set(c.date, [])
    byDate.get(c.date).push(c)
  }

  const days = Array.from(byDate.entries())
    .map(([date, items]) => {
      const typeCounts = {}
      for (const it of items) {
        typeCounts[it.type] = (typeCounts[it.type] || 0) + 1
      }
      const totals = items.reduce(
        (acc, it) => {
          acc.files += it.stats.files
          acc.insertions += it.stats.insertions
          acc.deletions += it.stats.deletions
          return acc
        },
        { files: 0, insertions: 0, deletions: 0 }
      )
      return { date, count: items.length, typeCounts, totals, commits: items }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const out = {
    generatedAt: new Date().toISOString(),
    totalCommits: commits.length,
    days,
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(out))
  console.log(`[work-history] wrote ${days.length} days, ${commits.length} commits → ${path.relative(process.cwd(), OUTPUT)}`)
}

main()
