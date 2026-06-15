# Marelune Bali - GitHub Pages Preview Repo

This repository is prepared for a quick live preview with GitHub Pages.

## Deploy With GitHub Pages

1. Create a new GitHub repository.
2. Upload everything in this folder to the repository root.
3. Commit to the `main` branch.
4. Open GitHub repository `Settings -> Pages`.
5. Set `Source` to `GitHub Actions`.
6. Open the `Actions` tab and wait for `Deploy Marelune Bali to GitHub Pages` to finish.

The preview URL will usually look like:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

## Important Notes

- The website source lives in `Production-Code`.
- The build output is generated automatically by GitHub Actions.
- Pages CMS reads the root `.pages.yml` and edits files inside `Production-Code/content`.
- GitHub Pages is static hosting only. The lead form will show the WhatsApp fallback there because `/api/leads` requires a serverless environment such as Cloudflare Pages Functions.

## Local Preview

```bash
cd Production-Code
node build.mjs
python3 -m http.server 4173 --directory dist
```

Then open:

```text
http://127.0.0.1:4173/
```

## CMS

After the repository is on GitHub, open:

```text
https://app.pagescms.org
```

Connect this GitHub repository. The CMS collections are configured in `.pages.yml`.

## Custom Domain Later

When you move from team preview to a real custom domain, set the GitHub repository variable:

```text
USE_CUSTOM_DOMAIN=true
```

Then configure the custom domain in GitHub Pages settings.
