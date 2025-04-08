## 🛠️ Deno Setup (Optional but Recommended for VS Code)

To ensure a smooth development experience with Deno in this project, especially when working in the `supabase/functions` directory, we recommend the following local VS Code configuration.

> ⚠️ **Note:** These settings are for local use only — do **not** commit them to the repository. Add them manually to your `.vscode/settings.json`.

### 👉 Recommended `.vscode/settings.json`

```json
{
  "deno.enablePaths": [
    "supabase/functions"
  ],
  "deno.lint": true,
  "deno.unstable": [
    "bare-node-builtins",
    "byonm",
    "sloppy-imports",
    "unsafe-proto",
    "webgpu",
    "broadcast-channel",
    "worker-options",
    "cron",
    "kv",
    "ffi",
    "fs",
    "http",
    "net"
  ],
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
