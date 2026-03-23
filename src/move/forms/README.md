# Forms Module

This folder is organized by user actions, so file names read naturally:

- `Create*Form.tsx` for creation flows
- `Update*Form.tsx` for update flows
- `Publish*Form.tsx` for publish flows
- `Add*` / `Remove*` / `Attach*` for relationship and ownership actions

Shared building blocks are separated from feature forms:

- `FormUi.tsx` -> common form UI primitives (`FormRow`, checkboxes, typed inputs)
- `CollapsibleFormSectionRow.tsx` -> collapsible section wrapper used by forms
- `TransactionUtils.tsx` -> shared tx target and submit helpers
- `FormUtils.tsx` -> shared validation / parsing / Cars-mode content defaults
- `TxDigestResult.tsx` -> shared transaction result rendering

Use `index.ts` for imports from outside this folder.
