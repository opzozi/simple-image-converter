# Simple Image Converter

Chrome böngésző bővítmény, amely bármilyen weboldali képet PNG vagy JPEG formátumba konvertál egyetlen kattintással. React és Manifest V3 alapokon épül.

## Funkciók

- **Univerzális Konverzió** — WebP, AVIF, JPG és más formátumok PNG/JPEG formátumba alakítása
- **Vágólapra másolás** — Jobb klikk → „Kép másolása PNG/JPEG-ként"
- **Gyors és Hatékony** — Offscreen API használata optimális teljesítményért
- **Biztonság Első** — 100% offline, nincs adatgyűjtés
- **Többnyelvű** — Angol, német és magyar nyelv támogatása
- **Könnyű** — ~5-10 MB RAM használat

## Telepítés

### Chrome Web Store-ból
1. Látogasd meg a [Chrome Web Store oldalt](https://chrome.google.com/webstore/detail/clinbfiephmemllcffpddoabnknkaeki)
2. Kattints a "Hozzáadás a Chrome-hoz" gombra
3. Erősítsd meg a telepítést

### Kézi Telepítés (Fejlesztői Mód)
1. Töltsd le vagy klónozd ezt a repository-t
2. Nyisd meg a Chrome-ot és navigálj a `chrome://extensions/` címre
3. Kapcsold be a "Fejlesztői mód"-ot a jobb felső sarokban
4. Kattints a "Kicsomagolatlan bővítmény betöltése" gombra
5. Válaszd ki a bővítmény könyvtárát

## Használat

1. Navigálj bármilyen weboldalra, ahol képek vannak
2. Kattints jobb gombbal bármely képre
3. Válaszd a **"Kép mentése PNG-ként"** opciót a letöltéshez, vagy a **"Kép másolása PNG-ként"** opciót a vágólaphoz
4. Mentésnél válaszd ki a helyet; másolásnál illeszd be, ahol kell
5. Kész! A kép PNG-ként elérhető

## Technikai Részletek

### Technológia

- **React** — Modern komponens-alapú felület
- **Vite** — Gyors build eszköz
- **Manifest V3** — Jövőálló Chrome bővítmény szabvány
- **Service Worker** — Modern háttérfolyamat architektúra
- **Offscreen API** — Hatékony Canvas hozzáférés képkonverzióhoz
- **Internationalization (i18n)** — Többnyelvű támogatás

### Engedélyek

- **`contextMenus`** — Jobb klikk menü opció hozzáadása
- **`downloads`** — Konvertált képek mentése
- **`offscreen`** — Canvas API hozzáférés a konverzióhoz
- **`<all_urls>`** — Képek betöltése bármely weboldalról (CORS kezelés)

## Támogatott Nyelvek

- English
- Deutsch
- Magyar

## Miért Ez a Bővítmény?

A WebP és AVIF képek mindenhol vannak, de nem minden eszköz támogatja őket. Photoshop CS6? Nem. Néhány CMS? Elutasítja. Email kliensek? Nem jelennek meg.

Ez a bővítmény egy kattintással PNG-vé alakítja őket. Probléma megoldva.

## Támogatás

Tetszik a bővítmény? Segíthetsz:

- [Támogatás PayPal-on](https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG)
- Adj csillagot a [GitHub repository-nak](https://github.com/opzozi/simple-image-converter)
- Hagyj értékelést a Chrome Web Store-ban

## Licenc

Ez a projekt MIT License alatt van - lásd a [LICENSE](LICENSE) fájlt a részletekért.

## Problémák

Találtál hibát? [Nyiss egy issue-t](https://github.com/opzozi/simple-image-converter/issues) a GitHubon.

## Kapcsolat

GitHub: [@opzozi](https://github.com/opzozi)
