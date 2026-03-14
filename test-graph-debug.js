// Quick test script to verify pass-through edges logic
const commits = [
  {
    hash: 'aaa',
    abbreviatedHash: 'aaa',
    parents: ['bbb'],
    author: 'Test',
    authorEmail: 'test@test.com',
    authorDate: new Date(),
    subject: 'Commit A',
    refs: []
  },
  {
    hash: 'bbb',
    abbreviatedHash: 'bbb',
    parents: ['ccc'],
    author: 'Test',
    authorEmail: 'test@test.com',
    authorDate: new Date(),
    subject: 'Commit B',
    refs: []
  },
  {
    hash: 'ccc',
    abbreviatedHash: 'ccc',
    parents: ['ddd'],
    author: 'Test',
    authorEmail: 'test@test.com',
    authorDate: new Date(),
    subject: 'Commit C',
    refs: []
  },
  {
    hash: 'ddd',
    abbreviatedHash: 'ddd',
    parents: [],
    author: 'Test',
    authorEmail: 'test@test.com',
    authorDate: new Date(),
    subject: 'Commit D',
    refs: []
  }
]

// Simulate algorithm
const lanes = []
const rows = []
const hashToRowIndex = new Map()

// Pass 1: Assign columns
for (let i = 0; i < commits.length; i++) {
  const commit = commits[i]
  let col = lanes.indexOf(commit.hash)
  if (col === -1) {
    col = lanes.indexOf(null)
    if (col === -1) {
      col = lanes.length
      lanes.push(null)
    }
  }
  lanes[col] = commit.parents[0] ?? null
  rows.push({ commit, column: col, edges: [], passThroughEdges: [], incomingEdges: [] })
  hashToRowIndex.set(commit.hash, i)
}

// Pass 2: Compute edges
for (let i = 0; i < rows.length; i++) {
  const row = rows[i]
  for (const parentHash of row.commit.parents) {
    const parentRowIndex = hashToRowIndex.get(parentHash)
    if (parentRowIndex !== undefined) {
      const parentRow = rows[parentRowIndex]
      const edge = {
        fromColumn: row.column,
        toColumn: parentRow.column,
        fromRow: i,
        toRow: parentRowIndex,
        color: '#569CD6'
      }
      row.edges.push(edge)
      parentRow.incomingEdges.push(edge)
    }
  }
}

// Pass 3: Compute pass-through edges
for (let i = 0; i < rows.length; i++) {
  const row = rows[i]
  for (const edge of row.edges) {
    if (edge.fromColumn === edge.toColumn) {
      for (let intermediateRow = i + 1; intermediateRow < edge.toRow; intermediateRow++) {
        const intermediate = rows[intermediateRow]
        const column = edge.fromColumn
        const exists = intermediate.passThroughEdges.some((pte) => pte.column === column)
        if (!exists) {
          intermediate.passThroughEdges.push({ column, color: edge.color })
        }
      }
    }
  }
}

// Print results
console.log('\n=== Graph Debug Output ===\n')
for (let i = 0; i < rows.length; i++) {
  const row = rows[i]
  console.log(`Row ${i}: ${row.commit.subject} (column ${row.column})`)
  console.log(`  Outgoing edges: ${row.edges.length}`)
  console.log(`  Incoming edges: ${row.incomingEdges.length}`)
  console.log(`  Pass-through edges: ${row.passThroughEdges.length}`)
  if (row.passThroughEdges.length > 0) {
    console.log(`    -> Columns: ${row.passThroughEdges.map((p) => p.column).join(', ')}`)
  }
  console.log()
}

console.log('Expected: Rows 1 and 2 should have pass-through edges in column 0')
