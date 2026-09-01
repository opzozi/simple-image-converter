# Repository strategy — Free vs PRO

Simple Image Converter is split into two products with separate licenses and separate source trees.

## Public repository (this repo)

- **License:** MIT — see [LICENSE](../LICENSE)
- **Purpose:** Free Chrome extension source code
- **Includes:** Context-menu save/copy, PNG/JPEG conversion, settings UI, i18n, offscreen conversion
- **Does not include:** Batch conversion implementation, license validation logic, Gumroad product IDs, or other PRO-only source files

Anyone may fork, modify, and redistribute the free code under the MIT License.

## Private PRO repository (recommended)

- **License:** Proprietary — see [PRO_LICENSE.md](../PRO_LICENSE.md)
- **Purpose:** Full store build with PRO features enabled
- **Includes:** Everything in the free repo, plus:
  - `src/pro/` — license manager, PRO UI, batch conversion
  - `src/pro/features/BatchConvert.real.jsx` — batch implementation
  - Production `license-config.js` with Gumroad `product_id`
  - Store release scripts and signing assets

Keep the private repository on **GitHub Private** or another host with access control. Do not push PRO source to the public MIT repository.

## Recommended workflow

1. Develop shared fixes in the **public** repo (or merge them from public into private regularly).
2. Maintain PRO-only code only in the **private** repo.
3. Build the Chrome Web Store package from the **private** repo after `npm run build`.
4. Never commit secrets to either repo:
   - Gumroad `product_id`
   - API keys
   - Signing keys (`.pem`, `.crx`)

## Files that must stay out of the public repo

| Pattern | Reason |
|---------|--------|
| `src/pro/features/*.real.jsx` | PRO batch implementation |
| `src/pro/features/*.real.js` | PRO batch implementation |
| `src/pro/license-config.js` with real `GUMROAD_PRODUCT_ID` | Store secret |
| `.env`, `.env.local` | Environment secrets |
| `*.pem`, `*.crx` | Extension signing |

The public `.gitignore` already excludes these patterns so they are not committed accidentally when you work in a combined local tree.

## Store build checklist

- [ ] Build from the private PRO tree
- [ ] `GUMROAD_PRODUCT_ID` set for production
- [ ] `npm run build` completes without errors
- [ ] Manual test: save, copy, batch convert, license activation
- [ ] Zip the `dist/` folder for upload
- [ ] Do not publish the private repo or PRO source archive

## Syncing free changes into PRO

When the public repo receives fixes (for example JPEG transparency or protected-page handling):

1. Merge or cherry-pick the public branch into your private PRO branch.
2. Resolve conflicts only in shared files (`background.js`, `offscreen.js`, locales, etc.).
3. Re-run build and regression tests before publishing a store update.
