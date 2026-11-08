# Cloudflare R2 Multi-Software Update Server Setup

## Domain: `updates.dodatech.com`
## Bucket: `dodatech-updates`

This bucket serves updates for all DodaTech software products using dedicated subdirectories:
- **DodaZip**: `https://updates.dodatech.com/dodazip/latest.json`
- **Durga AV**: `https://updates.dodatech.com/durga-av/latest.json`
- (Other tools): `https://updates.dodatech.com/<software-name>/latest.json`

---

## Step 1: Disconnect `updates.dodatech.com` from `durga-av-updates`

Since Cloudflare does not allow attaching the same custom domain to two buckets simultaneously, first disconnect the domain from the old bucket:

1. In the **Cloudflare Dashboard**, navigate to **R2 Object Storage**.
2. Click on the existing bucket: **`durga-av-updates`**.
3. Go to the **Settings** tab.
4. Scroll down to **Custom Domains**.
5. Find `updates.dodatech.com` and click the **three dots (...)** or **Delete / Disconnect** button.
6. Confirm the disconnection.  
   *(Your existing files in `durga-av-updates` remain completely safe and untouched).*

---

## Step 2: Create the New Bucket `dodatech-updates`

1. Go back to the **R2 Object Storage** main page.
2. Click **Create bucket**.
3. Bucket name: **`dodatech-updates`**.
4. Location: **Automatic** (or preferred region).
5. Click **Create Bucket**.

---

## Step 3: Connect `updates.dodatech.com` to `dodatech-updates`

1. Open the newly created **`dodatech-updates`** bucket.
2. Go to the **Settings** tab.
3. Scroll down to **Custom Domains** and click **Connect Domain**.
4. Enter: **`updates.dodatech.com`**.
5. Click **Continue** $\rightarrow$ **Connect Domain**.  
   *(Cloudflare will immediately bind the domain to this bucket).*

---

## Step 4: Configure CORS Policy

In the same **Settings** tab of `dodatech-updates`:
1. Scroll down to **CORS Policy** and click **Add CORS Policy**.
2. Paste this configuration:
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
3. Click **Save**.

---

## Step 5: Directory Structure in `dodatech-updates`

Organize your bucket using clean subdirectories for each product:

```
dodatech-updates/
├── dodazip/
│   ├── latest.json
│   └── releases/
│       ├── DodaZip-Setup-v0.1.0.exe
│       └── DodaZip-v0.1.0-windows-x64-portable.zip
└── durga-av/
    ├── latest.json
    └── releases/
        └── DurgaAV-Setup.exe
```

### DodaZip `latest.json` Content
Upload this to `dodazip/latest.json`:
```json
{
  "version": "0.1.0",
  "downloadUrl": "https://updates.dodatech.com/dodazip/releases/DodaZip-Setup-v0.1.0.exe",
  "portableUrl": "https://updates.dodatech.com/dodazip/releases/DodaZip-v0.1.0-windows-x64-portable.zip",
  "releaseDate": "2026-11-08",
  "notes": "DodaZip v0.1.0\n- High-Trust Vault Engine (.dzip)\n- AES-256 military encryption & BLAKE3 integrity verification\n- Multi-language interface (10 languages)\n- Windows Explorer context menu & SendTo integration"
}
```

---

## Step 6 (Optional): Delete Old Bucket `durga-av-updates`

Once you have migrated any Durga AV files into the `durga-av/` directory in `dodatech-updates`:
1. Navigate to **R2** $\rightarrow$ `durga-av-updates` $\rightarrow$ **Settings**.
2. Scroll to the bottom and click **Delete Bucket**.
