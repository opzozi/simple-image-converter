# Simple Image Converter

Chrome böngésző bővítmény, amely bármilyen weboldali képet PNG formátumba konvertál egyetlen kattintással.

## 🌟 Funkciók

- **🔄 Univerzális Konverzió:** WebP, AVIF, JPG és más formátumok automatikus PNG-vé alakítása
- **⚡ Gyors és Hatékony:** Modern Offscreen API használata optimális teljesítményért
- **🔒 Biztonság Első:** 100% offline konverzió, nincs adatgyűjtés, külső szerverek nélkül
- **🌍 Többnyelvű:** Angol, német és magyar nyelv támogatása
- **🎨 Modern UI:** Gyönyörű gradiens dizájn intuitív popup-pal
- **📦 Könnyű:** Minimális erőforrás használat (~5-10 MB RAM)

## 🚀 Telepítés

### Chrome Web Store-ból
1. Látogasd meg a Chrome Web Store oldalt
2. Kattints a "Hozzáadás a Chrome-hoz" gombra
3. Erősítsd meg a telepítést

### Kézi Telepítés (Fejlesztői Mód)
1. Töltsd le vagy klónozd ezt a repository-t
2. Nyisd meg a Chrome-ot és navigálj a `chrome://extensions/` címre
3. Kapcsold be a "Fejlesztői mód"-ot a jobb felső sarokban
4. Kattints a "Kicsomagolatlan bővítmény betöltése" gombra
5. Válaszd ki a bővítmény könyvtárát

## 📖 Használat

1. Navigálj bármilyen weboldalra, ahol képek vannak
2. Kattints jobb gombbal bármely képre
3. Válaszd a **"Kép mentése PNG-ként"** opciót a menüből
4. Válaszd ki, hova szeretnéd menteni a fájlt
5. Kész! A képed PNG formátumban lett elmentve

## 🔧 Technikai Részletek

### Építve

- **Manifest V3:** Jövőálló Chrome bővítmény szabvány
- **Service Worker:** Modern háttérfolyamat architektúra
- **Offscreen API:** Hatékony Canvas hozzáférés képkonverzióhoz
- **Internationalization (i18n):** Többnyelvű támogatás

### Engedélyek

- **`contextMenus`**: Jobb klikk menü opció hozzáadása
- **`downloads`**: Konvertált képek mentése
- **`offscreen`**: Canvas API hozzáférés a konverzióhoz
- **`<all_urls>`**: Képek betöltése bármely weboldalról (CORS kezelés)

## 🌍 Támogatott Nyelvek

- 🇬🇧 English
- 🇩🇪 Deutsch
- 🇭🇺 Magyar

## 🎯 Miért Használd Ezt a Bővítményt?

A modern weboldalak WebP és AVIF formátumokat használnak jobb teljesítményért, de ezek a formátumok nem mindenhol támogatottak:

- ❌ A Photoshop régebbi verziói nem támogatják a WebP-t
- ❌ Sok CMS platform elutasítja a WebP feltöltéseket
- ❌ Egyes email kliensek nem tudják megjeleníteni a WebP képeket
- ❌ Kompatibilitási problémák különböző képszerkesztő eszközökkel

**Ez a bővítmény megoldja ezeket a problémákat egyetlen kattintással, PNG formátumra konvertálva a képeket.**

## 💖 Fejlesztés Támogatása

Ha hasznosnak találod ezt a bővítményt, támogasd a fejlesztést:

- ☕ [PayPal Donation](https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG)
- ⭐ Adj csillagot a [GitHub repository-nak](https://github.com/opzozi/simple-image-converter)
- 📝 Hagyj értékelést a Chrome Web Store-ban

## 📄 Licenc

Ez a projekt MIT License alatt van - lásd a [LICENSE](LICENSE) fájlt a részletekért.

## 🐛 Hibajelentések

Ha bármilyen problémát tapasztalsz, kérlek jelezd a Chrome Web Store vélemények részében, vagy vedd fel a kapcsolatot a fejlesztővel.

## 🔮 Jövőbeli Tervek

- [ ] További kimeneti formátumok támogatása (JPEG, WebP)
- [ ] Képminőség beállítások
- [ ] Tömeges konverzió
- [ ] Képméret átállítási lehetőségek
- [ ] Vágólapra másolás PNG-ként

## 🙏 Köszönetnyilvánítás

- Ikonok modern gradiens stílussal tervezve
- Chrome Extension Manifest V3-mal építve
- Köszönet minden közreműködőnek és felhasználónak

---

**Verzió:** 1.0.0

**Utolsó Frissítés:** 2025. december 4.

