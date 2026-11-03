# tree-sitter-structured-control-language

Tree-sitter grammar for Siemens SCL as TIA Portal V20 exports it: `.scl` blocks,
`.udt` PLC data types, `.db` data blocks and `.nvt` named value types.

## Tests

```sh
npm install
npx tree-sitter generate
npx tree-sitter test
```

The corpus in `test/corpus/` has one small, hand-written case per construct of
Portal's export format (block headers, attribute lists, time and typed literals,
operand forms, instance DB type lines, named value types, …). The cases are
written from the format notes in `jensalmkvist/tia-import-export`
(`docs/rea/languages/scl/export.md`, `writer-answers.md`,
`docs/rea/plc-folder/types-dbs-tags/data-types.md`, `data-blocks.md`), never
copied from project files.

## Checking a whole workspace

To check that every file of a real TIA text workspace parses, run this
locally (it prints counts, node names and, with `--files`, file paths, but
never file contents):

```sh
npm run check-workspace -- <workspace folder> [--files]
```

It parses every `.scl`, `.udt`, `.db` and `.nvt` file below the folder with
this checkout's grammar and groups the failing files by where the first
`ERROR` / `MISSING` node sits. The exit code is 1 when any file fails. Keep
customer files out of this repository.
