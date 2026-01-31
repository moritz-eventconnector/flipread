# Statische Assets

Platzieren Sie hier Ihre statischen Dateien:

## Erforderliche Dateien

- **favicon.png** - Favicon für Browser-Tabs (PNG-Format, empfohlen: 32x32 oder 64x64 Pixel)
- **favicon.ico** - Favicon für ältere Browser (optional, wird automatisch aus PNG generiert falls nicht vorhanden)
- **logo.png** - Hauptlogo der Anwendung (empfohlen: transparent, mindestens 200px Breite)

## Verwendung

Die Dateien werden automatisch verwendet:
- `favicon.png` → erscheint im Browser-Tab (moderne Browser)
- `favicon.ico` → erscheint im Browser-Tab (Fallback für ältere Browser)
- `logo.png` → erscheint auf der Landing Page, Login, Register und im Footer

Nach dem Hinzufügen der Dateien werden sie automatisch unter `/favicon.png`, `/favicon.ico` und `/logo.png` verfügbar sein.

## Wichtige Hinweise

1. **Dateien hochladen**: Legen Sie `favicon.png` (und optional `favicon.ico`) direkt in dieses `public/` Verzeichnis ab.

2. **Browser-Cache leeren**: Falls das Favicon nicht angezeigt wird:
   - Strg+Shift+R (Windows/Linux) oder Cmd+Shift+R (Mac)
   - Oder: Strg+F5
   - Oder: Inkognito-Modus verwenden

3. **Verfügbarkeit prüfen**: Nach dem Update sollten die Dateien erreichbar sein unter:
   - `https://ihre-domain.de/favicon.png`
   - `https://ihre-domain.de/favicon.ico`

4. **Nach dem Update**: Führen Sie `sudo bash ./scripts/update.sh` aus, um die Änderungen zu übernehmen.

5. **Falls es immer noch nicht funktioniert**: 
   - Prüfen Sie die Browser-Entwicklertools (F12) → Network-Tab
   - Suchen Sie nach `favicon.png` oder `favicon.ico`
   - Prüfen Sie den HTTP-Status-Code (200 = OK, 404 = Datei nicht gefunden)

