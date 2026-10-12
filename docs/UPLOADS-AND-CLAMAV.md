# Upload controls and local ClamAV

## Hosted pilot uploads (12 October 2026)

The owner authorized uploads without scanning when a free hosted scanner is impractical. Set `UPLOAD_SCAN_MODE=unscanned` in Render's Environment and redeploy. This mode is explicitly supported in production; `unscanned-local` still is not. New files are recorded as `unscanned`, with visible upload notices, instead of being falsely recorded as antivirus-clean. Existing formats, size limits, school/user permissions, metadata stripping for photos and R2 budgets remain enforced; they do not detect all malware.

ClamAV is free software, but the standard signatures need substantially more RAM than Render Free's 512 MB. On a suitable future host, install ClamAV, update definitions with freshclam, configure CLAMAV_COMMAND and optionally CLAMAV_DATABASE_DIR, switch to `required`, restart and validate a clean fixture plus the EICAR antivirus test file. Scanner failure then blocks uploads. Switch to `disabled` and redeploy to stop uploads immediately. No public scanning service receives private school files. Previously uploaded files require a separate retrospective scan; changing policy does not scan them.

References: [ClamAV requirements](https://docs.clamav.net/), [Render compute plans](https://render.com/docs/compute-plans).

Edit `apps/api/.env`, then restart the Node backend after every configuration change. Vite does not reload the backend environment. Configuration is global to all schools on that API.

## Current local testing setting

```env
UPLOAD_SCAN_MODE=unscanned-local
CLAMAV_COMMAND=
```

Uploads are enabled without malware scanning only outside production. Use trusted dummy files. Permissions, PDF/PNG/JPEG validation, image dimensions, size limits and storage quotas still apply. This does not make files safe or label them as scanned. Production startup rejects this mode. The committed example remains scanner-required.

## Disable uploads later

```env
UPLOAD_SCAN_MODE=disabled
```

Restart the backend. New logo, gallery, learning-resource and homework file uploads are blocked, even when a scanner is configured. Existing downloads remain available. People/calendar Excel imports have their own bounded workbook validation and are not controlled by this attachment scanner setting.

## Require a scanner again

```env
UPLOAD_SCAN_MODE=required
CLAMAV_COMMAND=
```

Restart. With no scanner command, uploads are blocked. `required` is also the default when the mode is omitted. Unknown modes disable uploads and fail configuration checks.

## Configure free ClamAV on Windows

1. Install an official Windows ClamAV package using the [official installation guide](https://docs.clamav.net/manual/Installing.html). Choose a drive with sufficient space for programs, signature databases and temporary scanning data.
2. Follow the [configuration guide](https://docs.clamav.net/manual/Usage/Configuration.html): copy the supplied `freshclam.conf.sample` from `conf_examples` to `freshclam.conf` in the installation directory, remove/comment its `Example` line, and set a writable `DatabaseDirectory`. Configure paths for the actual installation, not the example below.
3. Download signatures with FreshClam. The scanning engine requires signatures before use. See [signature management](https://docs.clamav.net/manual/Usage/SignatureManagement.html).

Example commands for an installation at `D:\Tools\ClamAV`:

```powershell
& 'D:\Tools\ClamAV\freshclam.exe' --config-file='D:\Tools\ClamAV\freshclam.conf'
& 'D:\Tools\ClamAV\clamscan.exe' --version
& 'D:\Tools\ClamAV\clamscan.exe' --no-summary 'D:\TestFiles\sample.pdf'
```

Ensure ClamScan uses the same database location as FreshClam. Set the optional API setting `CLAMAV_DATABASE_DIR` below to the `DatabaseDirectory` used by FreshClam; the API passes it directly as ClamScan's documented `--database` option. If omitted, ClamScan uses its installation defaults. Schedule FreshClam updates with Windows Task Scheduler or its documented service support; an installed binary with missing/stale signatures is not sufficient. See [ClamScan options](https://docs.clamav.net/manual/Usage/Scanning.html).

Then configure:

```env
UPLOAD_SCAN_MODE=required
CLAMAV_COMMAND=D:/Tools/ClamAV/clamscan.exe
CLAMAV_DATABASE_DIR=D:/Tools/ClamAV/database
```

Use an executable path only, with no arguments or shell command. The API launches it directly, sends each file through stdin (`--no-summary -`) and waits up to 30 seconds. Exit code 0 accepts, 1 rejects an infected file, and other codes/timeouts/unavailable scanner block the upload. Run a clean-file upload and an official ClamAV test-file check in an isolated test setup before accepting real uploads. The guide does not install or certify a scanner on this machine.

On Linux, install your distribution's ClamAV package, configure/update FreshClam and set `CLAMAV_COMMAND=/usr/bin/clamscan`. Test under the API service account. ClamD is optional; this integration uses ClamScan directly and does not require a network scanner or paid service.

Files uploaded during unscanned testing are not automatically rescanned when switching modes. Review/rescan that stored material before a real-user release. Never delete the database or upload folders merely to change modes.
