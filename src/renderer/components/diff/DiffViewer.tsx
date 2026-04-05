// ============================================================
// Kommit — DiffViewer Component
// Renders unified diff with inline or side-by-side view
// Uses Shiki for syntax highlighting (async, on demand)
// ============================================================

import { useEffect, useRef, useState } from 'react'
import type { DiffFile, DiffHunk, DiffLine } from '@shared/types'
import { useChangesStore, type DiffViewMode } from '../../stores/changes-store'
import { useRepoStore } from '../../stores/repo-store'

interface DiffViewerProps {
  repoPath: string
  /** When set, shows a hunk staging button (working tree mode) */
  allowHunkStage?: boolean
}

// ─── Syntax highlighter (lazy Shiki init) ────────────────────────────────────

type HighlighterFn = (code: string, lang: string) => Promise<string>

let highlighterPromise: Promise<HighlighterFn> | null = null

function getHighlighter(): Promise<HighlighterFn> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki')
      const hl = await createHighlighter({
        themes: ['github-dark'],
        langs: []
      })
      return async (code: string, lang: string) => {
        try {
          await hl.loadLanguage(lang as Parameters<typeof hl.loadLanguage>[0])
        } catch {
          // Language not supported — fall back to plain text
        }
        return hl.codeToHtml(code, { lang: lang || 'text', theme: 'github-dark' })
      }
    })()
  }
  return highlighterPromise
}

function extToLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    sql: 'sql',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    vue: 'vue',
    svelte: 'svelte',
    graphql: 'graphql',
    dockerfile: 'dockerfile'
  }
  return map[ext] ?? 'text'
}

// ─── Line components ──────────────────────────────────────────────────────────

interface LineProps {
  line: DiffLine
  highlightedHtml: string | null
}

function InlineLine({ line, highlightedHtml }: LineProps) {
  const bg = line.type === 'add' ? 'bg-green-900/30' : line.type === 'delete' ? 'bg-red-900/30' : ''

  const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '
  const oldNum = line.oldLineNumber?.toString() ?? ''
  const newNum = line.newLineNumber?.toString() ?? ''

  return (
    <tr className={`${bg} hover:brightness-110 font-mono text-xs`}>
      <td className="select-none text-right pr-2 pl-2 text-[var(--color-text-muted)] w-10 min-w-10">
        {oldNum}
      </td>
      <td className="select-none text-right pr-2 text-[var(--color-text-muted)] w-10 min-w-10">
        {newNum}
      </td>
      <td
        className={`select-none pr-1 pl-2 w-4 font-bold ${
          line.type === 'add'
            ? 'text-green-400'
            : line.type === 'delete'
              ? 'text-red-400'
              : 'text-[var(--color-text-muted)]'
        }`}
      >
        {prefix}
      </td>
      <td className="pl-1 pr-4 whitespace-pre-wrap break-all">
        {highlightedHtml ? (
          // Extract just the code content from Shiki's <pre><code>…</code></pre>
          <span
            dangerouslySetInnerHTML={{
              __html: highlightedHtml
                .replace(/^<pre[^>]*><code[^>]*>/, '')
                .replace(/<\/code><\/pre>$/, '')
            }}
          />
        ) : (
          <span>{line.content}</span>
        )}
      </td>
    </tr>
  )
}

interface SideBySideLineProps {
  oldLine: DiffLine | null
  newLine: DiffLine | null
  oldHtml: string | null
  newHtml: string | null
}

function SideBySideLine({ oldLine, newLine, oldHtml, newHtml }: SideBySideLineProps) {
  const oldBg = oldLine?.type === 'delete' ? 'bg-red-900/30' : ''
  const newBg = newLine?.type === 'add' ? 'bg-green-900/30' : ''

  const renderCell = (line: DiffLine | null, html: string | null, bg: string) => (
    <td
      colSpan={2}
      className={`${bg} font-mono text-xs whitespace-pre-wrap break-all pl-2 pr-4 border-r border-[var(--color-border)]`}
    >
      {line ? (
        html ? (
          <span
            dangerouslySetInnerHTML={{
              __html: html.replace(/^<pre[^>]*><code[^>]*>/, '').replace(/<\/code><\/pre>$/, '')
            }}
          />
        ) : (
          <span>{line.content}</span>
        )
      ) : null}
    </td>
  )

  return (
    <tr className="hover:brightness-110">
      <td className="select-none text-right pr-2 pl-2 text-[var(--color-text-muted)] w-10 min-w-10 text-xs font-mono">
        {oldLine?.oldLineNumber ?? ''}
      </td>
      {renderCell(oldLine, oldHtml, oldBg)}
      <td className="select-none text-right pr-2 pl-2 text-[var(--color-text-muted)] w-10 min-w-10 text-xs font-mono">
        {newLine?.newLineNumber ?? ''}
      </td>
      {renderCell(newLine, newHtml, newBg)}
    </tr>
  )
}

// ─── Hunk component ───────────────────────────────────────────────────────────

interface HunkProps {
  hunk: DiffHunk
  diffFile: DiffFile
  viewMode: DiffViewMode
  allowHunkStage: boolean
  repoPath: string
  onStaged: () => void
}

function HunkView({ hunk, diffFile, viewMode, allowHunkStage, repoPath, onStaged }: HunkProps) {
  const [htmlMap, setHtmlMap] = useState<Map<string, string>>(new Map())
  const { stageHunk } = useChangesStore()
  const lang = extToLang(diffFile.newPath)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const hl = await getHighlighter()
        const map = new Map<string, string>()
        await Promise.all(
          hunk.lines.map(async (line, idx) => {
            if (line.content.trim().length === 0) return
            const html = await hl(line.content, lang)
            map.set(`${idx}`, html)
          })
        )
        if (!cancelled) setHtmlMap(map)
      } catch {
        // Highlight failed silently — plain text fallback
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hunk, lang])

  const handleStageHunk = async () => {
    // Build a minimal patch for git apply --cached
    const header =
      `--- a/${diffFile.oldPath}\n` +
      `+++ b/${diffFile.newPath}\n` +
      `${hunk.header}\n` +
      hunk.lines
        .map((l) => {
          const prefix = l.type === 'add' ? '+' : l.type === 'delete' ? '-' : ' '
          return `${prefix}${l.content}`
        })
        .join('\n') +
      '\n'
    await stageHunk(repoPath, header)
    onStaged()
  }

  // Build side-by-side pairs
  const sidePairs: Array<{ old: DiffLine | null; new: DiffLine | null }> = []
  if (viewMode === 'side-by-side') {
    let i = 0
    while (i < hunk.lines.length) {
      const line = hunk.lines[i]
      if (line.type === 'context') {
        sidePairs.push({ old: line, new: line })
        i++
      } else {
        // Collect a block of deletions followed by additions
        const dels: DiffLine[] = []
        const adds: DiffLine[] = []
        while (i < hunk.lines.length && hunk.lines[i].type === 'delete') {
          dels.push(hunk.lines[i++])
        }
        while (i < hunk.lines.length && hunk.lines[i].type === 'add') {
          adds.push(hunk.lines[i++])
        }
        const max = Math.max(dels.length, adds.length)
        for (let j = 0; j < max; j++) {
          sidePairs.push({ old: dels[j] ?? null, new: adds[j] ?? null })
        }
      }
    }
  }

  return (
    <div className="mb-2">
      {/* Hunk header bar */}
      <div className="flex items-center justify-between bg-[var(--color-bg-hover)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] font-mono border-y border-[var(--color-border)]">
        <span>{hunk.header}</span>
        {allowHunkStage && (
          <button
            onClick={handleStageHunk}
            className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white hover:opacity-80"
            title="Stage hunk"
          >
            Stage hunk
          </button>
        )}
      </div>

      {/* Lines */}
      <table className="w-full border-collapse">
        <tbody>
          {viewMode === 'inline'
            ? hunk.lines.map((line, idx) => (
                <InlineLine key={idx} line={line} highlightedHtml={htmlMap.get(`${idx}`) ?? null} />
              ))
            : sidePairs.map((pair, idx) => {
                const oldIdx = hunk.lines.indexOf(pair.old!)
                const newIdx = hunk.lines.indexOf(pair.new!)
                return (
                  <SideBySideLine
                    key={idx}
                    oldLine={pair.old}
                    newLine={pair.new}
                    oldHtml={pair.old ? (htmlMap.get(`${oldIdx}`) ?? null) : null}
                    newHtml={pair.new ? (htmlMap.get(`${newIdx}`) ?? null) : null}
                  />
                )
              })}
        </tbody>
      </table>
    </div>
  )
}

// ─── File tab nav ─────────────────────────────────────────────────────────────

interface FileTabsProps {
  files: DiffFile[]
  selectedIdx: number
  onSelect: (idx: number) => void
}

function FileTabs({ files, selectedIdx, onSelect }: FileTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0">
      {files.map((f, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`px-3 py-1.5 text-xs whitespace-nowrap border-r border-[var(--color-border)] transition-colors ${
            idx === selectedIdx
              ? 'bg-[var(--color-bg-hover)] text-[var(--color-text)] border-b-2 border-b-[var(--color-accent)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
          }`}
        >
          {f.newPath.split('/').pop()}
          {f.status === 'added' && <span className="ml-1 text-green-400">(added)</span>}
          {f.status === 'deleted' && <span className="ml-1 text-red-400">(deleted)</span>}
          {f.status === 'renamed' && <span className="ml-1 text-blue-400">(renamed)</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiffViewer({ repoPath, allowHunkStage = false }: DiffViewerProps) {
  const { currentDiff, isDiffLoading, diffViewMode, setDiffViewMode, selectedFile } =
    useChangesStore()
  const { refreshStatus } = useRepoStore()
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const prevDiffRef = useRef(currentDiff)

  // Reset file tab when diff changes
  useEffect(() => {
    if (prevDiffRef.current !== currentDiff) {
      setSelectedFileIdx(0)
      prevDiffRef.current = currentDiff
    }
  }, [currentDiff])

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
        Select a file to view diff
      </div>
    )
  }

  if (isDiffLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
        Loading diff…
      </div>
    )
  }

  if (currentDiff.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
        No changes to display
      </div>
    )
  }

  const file = currentDiff[selectedFileIdx] ?? currentDiff[0]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-bg)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border)] shrink-0">
        <span className="text-xs text-[var(--color-text-muted)] truncate font-mono">
          {file?.newPath ?? ''}
        </span>
        {/* Inline / Side-by-side toggle */}
        <div className="flex rounded border border-[var(--color-border)] overflow-hidden text-xs">
          <button
            onClick={() => setDiffViewMode('inline')}
            className={`px-2 py-0.5 ${diffViewMode === 'inline' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
          >
            Inline
          </button>
          <button
            onClick={() => setDiffViewMode('side-by-side')}
            className={`px-2 py-0.5 ${diffViewMode === 'side-by-side' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
          >
            Split
          </button>
        </div>
      </div>

      {/* File tabs (only if multiple files) */}
      {currentDiff.length > 1 && (
        <FileTabs files={currentDiff} selectedIdx={selectedFileIdx} onSelect={setSelectedFileIdx} />
      )}

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {file.isBinary ? (
          <div className="flex items-center justify-center h-20 text-sm text-[var(--color-text-muted)]">
            Binary file — no diff available
          </div>
        ) : file.hunks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-[var(--color-text-muted)]">
            No visible changes
          </div>
        ) : (
          file.hunks.map((hunk, idx) => (
            <HunkView
              key={idx}
              hunk={hunk}
              diffFile={file}
              viewMode={diffViewMode}
              allowHunkStage={allowHunkStage}
              repoPath={repoPath}
              onStaged={() => {
                // Refresh diff and status after staging a hunk
                void refreshStatus?.()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
