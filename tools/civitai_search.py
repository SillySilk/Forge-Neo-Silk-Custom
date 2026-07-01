#!/usr/bin/env python3
"""
Civitai model search helper for Forge Neo research.

Queries Civitai's public REST API and prints a compact Markdown table (and optional
raw JSON) so an assistant / you can scan candidate checkpoints without opening the
web UI. Works without a token for SFW results; pass --nsfw with a token for the full
catalog.

Token: create one at Civitai -> Account Settings -> API Keys, then either
  set CIVITAI_TOKEN=xxxx   (Windows)   /   export CIVITAI_TOKEN=xxxx   (bash)
or pass --token xxxx.

Examples:
  python tools/civitai_search.py --base "Flux.1 D" --sort "Most Downloaded" --limit 20
  python tools/civitai_search.py --query "realistic" --base "SDXL 1.0" --nsfw
  python tools/civitai_search.py --base "Chroma" --json out.json
"""
import argparse
import json
import os
import ssl
import sys
import urllib.parse
import urllib.request

API = "https://civitai.com/api/v1/models"


def _ssl_context(insecure: bool) -> ssl.SSLContext:
    if insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    try:  # prefer certifi's CA bundle (avoids Windows cert-store issues)
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:  # noqa: BLE001
        return ssl.create_default_context()


def fetch(params: dict, token: str | None, insecure: bool = False) -> dict:
    url = API + "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={"User-Agent": "forge-neo-research/1.0"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60, context=_ssl_context(insecure)) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="Search Civitai models.")
    ap.add_argument("--query", help="free-text search")
    ap.add_argument("--base", action="append", default=[],
                    help='base model filter, repeatable (e.g. "SDXL 1.0", "Flux.1 D", "Chroma")')
    ap.add_argument("--types", default="Checkpoint",
                    help="comma list: Checkpoint,LORA,VAE,Controlnet,... (default Checkpoint)")
    ap.add_argument("--tag", help="filter by a single tag")
    ap.add_argument("--sort", default="Most Downloaded",
                    choices=["Most Downloaded", "Highest Rated", "Newest", "Most Liked"])
    ap.add_argument("--period", default="AllTime",
                    choices=["AllTime", "Year", "Month", "Week", "Day"])
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--nsfw", action="store_true", help="include NSFW (needs a token)")
    ap.add_argument("--token", default=os.environ.get("CIVITAI_TOKEN"))
    ap.add_argument("--json", help="also write raw JSON to this path")
    ap.add_argument("--insecure", action="store_true",
                    help="skip SSL verification (workaround for Windows cert-store errors)")
    args = ap.parse_args()

    params: dict = {
        "limit": args.limit,
        "types": args.types,
        "sort": args.sort,
        "period": args.period,
        "nsfw": "true" if args.nsfw else "false",
    }
    if args.query:
        params["query"] = args.query
    if args.base:
        params["baseModels"] = args.base
    if args.tag:
        params["tag"] = args.tag

    if args.nsfw and not args.token:
        print("! --nsfw requested but no token (CIVITAI_TOKEN). NSFW results will be filtered.\n",
              file=sys.stderr)

    try:
        data = fetch(params, args.token, insecure=args.insecure)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR querying Civitai: {e}", file=sys.stderr)
        if "CERTIFICATE_VERIFY_FAILED" in str(e):
            print("  -> retry with --insecure, or `pip install certifi`.", file=sys.stderr)
        return 1

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    items = data.get("items", [])
    print(f"# Civitai results - types={args.types} base={args.base or 'any'} "
          f"sort={args.sort} nsfw={args.nsfw} ({len(items)})\n")
    print("| Model | Base | Downloads | NSFW | Tags | URL |")
    print("|---|---|---|---|---|---|")
    for m in items:
        stats = m.get("stats", {})
        versions = m.get("modelVersions", [])
        base = versions[0].get("baseModel", "?") if versions else "?"
        tags = ", ".join((m.get("tags") or [])[:5])
        nsfw = "yes" if m.get("nsfw") else "no"
        dl = stats.get("downloadCount", "?")
        name = str(m.get("name", "?")).replace("|", "/")
        url = f"https://civitai.com/models/{m.get('id')}"
        print(f"| {name} | {base} | {dl} | {nsfw} | {tags} | {url} |")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
