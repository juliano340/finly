<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:graphify-agent-rules -->
# Knowledge Graph (graphify)

A knowledge graph of this codebase lives in `graphify-out/` (graph.json, GRAPH_REPORT.md, graph.html).

- **Before answering questions about code architecture, data flow, or feature relationships**, query the graph first (`graphify query "<question>"` or inspect `graphify-out/graph.json`) — it is much cheaper than re-reading source files.
- **After code changes**, the post-commit hook auto-rebuilds the graph on `git commit`. If you changed files without committing and need fresh graph data, run `graphify --update`.
- Node IDs follow the pattern `{path}_{symbol}`; communities are labeled in `GRAPH_REPORT.md`.
<!-- END:graphify-agent-rules -->
