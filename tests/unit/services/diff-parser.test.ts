// ============================================================
// Kommit — Diff Parser Unit Tests
// Tests for parseDiff() with various diff scenarios
// ============================================================

import { describe, it, expect } from 'vitest'
import { parseDiff } from '../../../src/shared/diff-parser'

describe('parseDiff()', () => {
  it('should return empty array for empty input', () => {
    expect(parseDiff('')).toEqual([])
    expect(parseDiff('  \n  ')).toEqual([])
  })

  it('should parse a modified file diff', () => {
    const raw = `diff --git a/src/foo.ts b/src/foo.ts
index abc1234..def5678 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 line one
-old line
+new line
+added line
 line three
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('modified')
    expect(result[0].oldPath).toBe('src/foo.ts')
    expect(result[0].newPath).toBe('src/foo.ts')
    expect(result[0].isBinary).toBe(false)
    expect(result[0].hunks).toHaveLength(1)
  })

  it('should parse an added file diff', () => {
    const raw = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return 'world'
+}
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('added')
    expect(result[0].newPath).toBe('new-file.ts')
    // All lines should be 'add' type (no deletes)
    expect(result[0].hunks[0].lines.some((l) => l.type === 'add')).toBe(true)
    expect(result[0].hunks[0].lines.some((l) => l.type === 'delete')).toBe(false)
  })

  it('should parse a deleted file diff', () => {
    const raw = `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index abc1234..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function bye() {
-  return 'gone'
-}
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('deleted')
    expect(result[0].oldPath).toBe('old-file.ts')
    // All lines should be 'delete' type (no adds)
    expect(result[0].hunks[0].lines.some((l) => l.type === 'delete')).toBe(true)
    expect(result[0].hunks[0].lines.some((l) => l.type === 'add')).toBe(false)
  })

  it('should parse a renamed file diff', () => {
    const raw = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts
index abc1234..def5678 100644
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
 line one
-old line
+changed line
 line three
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('renamed')
    expect(result[0].oldPath).toBe('old-name.ts')
    expect(result[0].newPath).toBe('new-name.ts')
    expect(result[0].similarityIndex).toBe(95)
  })

  it('should parse a binary file diff', () => {
    const raw = `diff --git a/image.png b/image.png
index abc1234..def5678 100644
Binary files a/image.png and b/image.png differ
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].isBinary).toBe(true)
    expect(result[0].status).toBe('binary')
    expect(result[0].hunks).toHaveLength(0)
  })

  it('should parse multiple hunks in a single file', () => {
    const raw = `diff --git a/src/big.ts b/src/big.ts
index abc1234..def5678 100644
--- a/src/big.ts
+++ b/src/big.ts
@@ -1,4 +1,4 @@
 line one
-old line a
+new line a
 line three
 line four
@@ -20,4 +20,4 @@
 line twenty
-old line b
+new line b
 line twenty-two
 line twenty-three
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(1)
    expect(result[0].hunks).toHaveLength(2)
    expect(result[0].hunks[0].oldStart).toBe(1)
    expect(result[0].hunks[1].oldStart).toBe(20)
  })

  it('should correctly assign line numbers', () => {
    const raw = `diff --git a/src/foo.ts b/src/foo.ts
index abc1234..def5678 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -5,4 +5,5 @@
 context before
-deleted line
+added line one
+added line two
 context after
`
    const result = parseDiff(raw)
    const lines = result[0].hunks[0].lines

    const contextBefore = lines.find((l) => l.content === 'context before')
    expect(contextBefore?.oldLineNumber).toBe(5)
    expect(contextBefore?.newLineNumber).toBe(5)

    const deletedLine = lines.find((l) => l.type === 'delete')
    expect(deletedLine?.oldLineNumber).toBe(6)
    expect(deletedLine?.newLineNumber).toBeUndefined()

    const firstAdded = lines.find((l) => l.type === 'add' && l.content === 'added line one')
    expect(firstAdded?.newLineNumber).toBe(6)
    expect(firstAdded?.oldLineNumber).toBeUndefined()
  })

  it('should parse diffs for multiple files', () => {
    const raw = `diff --git a/src/a.ts b/src/a.ts
index 111..222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
-old a
+new a
diff --git a/src/b.ts b/src/b.ts
index 333..444 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1,2 +1,2 @@
-old b
+new b
`
    const result = parseDiff(raw)
    expect(result).toHaveLength(2)
    expect(result[0].newPath).toBe('src/a.ts')
    expect(result[1].newPath).toBe('src/b.ts')
  })
})
