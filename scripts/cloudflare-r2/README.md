# Cloudflare R2 Update Server Setup for updates.dodatech.com

Cloudflare R2 provides zero egress fees, global CDN distribution, and eliminates GitHub API rate limits (which limit unauthenticated users to 60 requests/hour).

---

## 1. Quick Architecture

```
User launches DodaZip ──▶ GET https://updates.dodatech.com/latest.json
                               │
                       ┌───────┴───────┐
                       │ Cloudflare R2 │
                       └───────┬───────┘
                               │
                       If version > current
                               │
            Download from https://updates.dodatech.com/releases/DodaZip-Setup-v...exe
```

---

## 2. Setup Cloudflare R2 Bucket

1. Log into your **Cloudflare Dashboard** $\rightarrow$ Navigate to **R2 Object Storage**.
2. Click **Create bucket**:
   - Bucket name: `dodazip-updates`
   - Location: Automatic
3. In bucket **Settings** $\rightarrow$ **Custom Domains**:
   - Click **Connect Domain**.
   - Enter `updates.dodatech.com`.
   - Cloudflare will automatically configure the DNS record and issue a free SSL certificate.
4. In bucket **Settings** $\rightarrow$ **CORS Policy**:
   - Click **Add CORS Policy** and paste:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

---

## 3. Uploading Files to R2

Upload the following files directly in the Cloudflare R2 dashboard or via API:

1. **`latest.json`** $\rightarrow$ at the bucket root (`https://updates.dodatech.com/latest.json`)
2. **`releases/DodaZip-Setup-v0.1.0.exe`** $\rightarrow$ in the `releases/` folder
3. **`releases/DodaZip-v0.1.0-windows-x64-portable.zip`** $\rightarrow$ in the `releases/` folder

---

## 4. `latest.json` Schema

```json
{
  "version": "0.1.0",
  "downloadUrl": "https://updates.dodatech.com/releases/DodaZip-Setup-v0.1.0.exe",
  "portableUrl": "https://updates.dodatech.com/releases/DodaZip-v0.1.0-windows-x64-portable.zip",
  "releaseDate": "2026-11-08",
  "notes": "Version release notes here..."
}
```

Whenever you release an update:
1. Upload the new `.exe` to `releases/`
2. Update the `version` number in `latest.json`
3. All running DodaZip installations will automatically detect the new version on next launch!
