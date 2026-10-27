"""Create a deterministic deployment ZIP; never uploads or configures hosting."""
from pathlib import Path
import hashlib, json, zipfile
root = Path(__file__).resolve().parents[1]
expected = {"index.html", "app.js", "style.css", "language.js", "anatomy.js", "feedback.js", "feedback-config.js", "measurement-feedback-client.mjs", "measurement-contract.mjs"}
entries = list((root / "dist").iterdir())
if {p.name for p in entries} != expected or any(not p.is_file() or p.is_symlink() for p in entries):
    raise SystemExit("dist must contain exactly the approved regular app files; review unexpected files/subdirectories in the release candidate")
files = {name: root / "dist" / name for name in sorted(expected)}
files.update({name: root / name for name in ["LICENSE", "THIRD_PARTY_NOTICES.md"]})
output = root / "artifacts" / "release"
output.mkdir(parents=True, exist_ok=True)
archive = output / "static-release.zip"
manifest = {}
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as z:
    for name, path in sorted(files.items()):
        data = path.read_bytes()
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED
        info.external_attr = 0o644 << 16
        z.writestr(info, data)
        manifest[name] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert set(z.namelist()) == set(files)
    for name, path in files.items():
        assert z.read(name) == path.read_bytes()
(output / "manifest.json").write_text(json.dumps({"archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": manifest}, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"archive": str(archive), "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": len(files)}))
