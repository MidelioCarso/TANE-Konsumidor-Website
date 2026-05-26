import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from django.conf import settings
from django.shortcuts import render


def _vite_server_is_running(vite_url):
	try:
		with urlopen(f"{vite_url}/@vite/client", timeout=0.4):
			return True
	except (URLError, OSError, ValueError):
		return False


def _get_manifest_assets():
	manifest_path = Path(settings.BASE_DIR) / "frontend" / "dist" / ".vite" / "manifest.json"
	if not manifest_path.exists():
		return None, []

	try:
		manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
	except (json.JSONDecodeError, OSError):
		return None, []

	main_entry = manifest_data.get("src/main.jsx") or manifest_data.get("index.html", {})
	main_js = main_entry.get("file")
	main_css = main_entry.get("css", [])
	return main_js, main_css


def react_home(request, *args, **kwargs):
	vite_url = getattr(settings, "VITE_DEV_SERVER_URL", "http://127.0.0.1:5173")
	vite_mode = getattr(settings, "VITE_DEV_MODE", settings.DEBUG)
	use_vite_dev = vite_mode and _vite_server_is_running(vite_url)

	main_js, main_css = (None, [])
	if not use_vite_dev:
		main_js, main_css = _get_manifest_assets()

	return render(
		request,
		"home/react_home.html",
		{
			"use_vite_dev": use_vite_dev,
			"vite_url": vite_url,
			"main_js": main_js,
			"main_css": main_css,
		},
	)
