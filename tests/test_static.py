#!/usr/bin/env python3
"""
Test tinh (static) + hoi quy cho 3 file Luau trong repo.
Chay:  python3 -m unittest discover -s tests -v
Tuy chon: dat LUAU_ANALYZE=/path/to/luau-analyze de bat test parse bang Luau 0.742,
          dat LUAU=/path/to/luau de bat unit-test trich xuat ham thuan.
Khong co Roblox/executor trong moi truong nay -> test runtime trong game la BLOCKED,
xem TEST_REPORT.md. Test nay KHONG mo phong ket qua runtime.
"""
import os, re, subprocess, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ["aiaiaitao3", "script.js", "script.js1.js"]

KNOWN_SERVICES = {
    "Players","TweenService","RunService","UserInputService","HttpService","TeleportService",
    "CoreGui","Lighting","MarketplaceService","GuiService","LogService","AssetService",
    "PhysicsService","ReplicatedStorage","VirtualUser","Workspace","StarterGui","SoundService",
    "ContextActionService","ProximityPromptService","CollectionService","Debris","Teams","Chat",
    "TextService","DataStoreService","ContentProvider","Selection","Stats",
}
ALLOWED_URL_HOSTS = ("roblox.com", "raw.githubusercontent.com")

# Baseline bao toan tinh nang: cac panel/keyword nay phai con ton tai sau moi lan sua.
FEATURE_BASELINE = {
    "aiaiaitao3": ["ExMenu", "NoClip", "ESP"],
    "script.js": ["HubFly_Panel","HubSpeed_Panel","HubHighJump_Panel","HubMove_Panel","HubLoc_Panel",
                  "HubGlow_Panel","HubFree_Panel","HubSafe_Panel","HubGlass_Panel","HubAntiBan_Panel",
                  "HubPerf_Panel","HubObjTrack_Panel","HubPlayerInfo_Panel","banana_cat_saved.json"],
    "script.js1.js": ["HubFly_Panel","HubSpeed_Panel","HubHighJump_Panel","HubMove_Panel","HubLoc_Panel",
                  "HubGlow_Panel","HubFree_Panel","HubSafe_Panel","HubGlass_Panel","HubAntiBan_Panel",
                  "HubPerf_Panel","HubObjTrack_Panel","HubPlayerInfo_Panel","HubSkinClass_Panel",
                  "banana_cat_saved.json"],
}

def read(fn): return (ROOT / fn).read_text(encoding="utf-8")

def strip_luau(src):
    """Bo comment/string de kiem tra can bang dau ngoac (xap xi, bo tro --[[ ]], [[ ]], "...", '...')."""
    out, i, n = [], 0, len(src)
    while i < n:
        if src.startswith("--", i):
            m = re.match(r"--\[(=*)\[", src[i:])
            if m:
                close = "]" + m.group(1) + "]"
                j = src.find(close, i + m.end())
                i = n if j < 0 else j + len(close)
            else:
                j = src.find("\n", i); i = n if j < 0 else j
            continue
        m = re.match(r"\[(=*)\[", src[i:])
        if m:
            close = "]" + m.group(1) + "]"
            j = src.find(close, i + m.end()); i = n if j < 0 else j + len(close); continue
        c = src[i]
        if c in "\"'":
            i += 1
            while i < n:
                if src[i] == "\\": i += 2; continue
                if src[i] == c: i += 1; break
                i += 1
            continue
        out.append(c); i += 1
    return "".join(out)

class TestFiles(unittest.TestCase):
    def test_exist_utf8_no_nul(self):
        for fn in FILES:
            b = (ROOT / fn).read_bytes()
            self.assertGreater(len(b), 1000, fn)
            b.decode("utf-8")                      # nem loi neu khong phai UTF-8
            self.assertNotIn(b"\x00", b, fn)

    def test_delimiter_balance(self):
        pairs = {")": "(", "]": "[", "}": "{"}
        for fn in FILES:
            code = strip_luau(read(fn)); stack = []
            for ch in code:
                if ch in "([{": stack.append(ch)
                elif ch in pairs:
                    self.assertTrue(stack and stack[-1] == pairs[ch], f"{fn}: lech dau {ch}")
                    stack.pop()
            self.assertEqual(stack, [], f"{fn}: con mo ngoac chua dong {stack[:5]}")

    def test_known_services(self):
        for fn in FILES:
            used = set(re.findall(r'GetService\("([^"]+)"\)', read(fn)))
            self.assertEqual(used - KNOWN_SERVICES, set(), f"{fn}: service la {used-KNOWN_SERVICES}")

    def test_remote_urls_https_allowlist(self):
        for fn in FILES:
            for u in re.findall(r"https?://[^\s\"'\)\]]+", read(fn)):
                if u.startswith("https://..."): continue
                self.assertTrue(u.startswith("https://"), f"{fn}: URL khong https: {u}")
                host = re.sub(r"^https://", "", u).split("/")[0]
                self.assertTrue(any(host == h or host.endswith("." + h) for h in ALLOWED_URL_HOSTS),
                                f"{fn}: host ngoai allowlist: {host}")

    def test_no_exfil_endpoints(self):
        for fn in FILES:
            low = read(fn).lower()
            for bad in ["discord.com/api/webhooks", "api.telegram.org", "webhook.site", "pastebin.com/api"]:
                self.assertNotIn(bad, low, f"{fn}: thay endpoint exfil {bad}")

    def test_feature_preservation_baseline(self):
        for fn, keys in FEATURE_BASELINE.items():
            t = read(fn)
            for k in keys: self.assertIn(k, t, f"{fn}: MAT tinh nang/panel {k}")

    def test_store_json_guarded(self):
        """Du lieu luu hong/khong hop le khong duoc lam sap hub: JSONDecode phai trong pcall."""
        for fn in ["script.js", "script.js1.js"]:
            t = read(fn)
            self.assertIn("banana_cat_saved.json", t, fn)
            self.assertRegex(t, r"pcall\(function\(\) return HttpService:JSONDecode", fn)

    # ---- Regression BUG-001: aiaiaitao3 server-hop handler loi mang/JSON ----
    def test_bug001_server_hop_guarded(self):
        t = read("aiaiaitao3")
        i = t.index("serverHopBtn.Activated")
        handler = t[i:i + 1600]
        self.assertIn("pcall(function()", handler, "BUG-001 tai phat: request/JSON chua boc pcall")
        self.assertIn('type(res) ~= "table"', handler)
        self.assertIn("tonumber(s.playing)", handler, "BUG-001: playing/maxPlayers chua chiu nil")
        self.assertIn('if type(s) == "table" then', handler, "BUG-001: chua guard type truoc khi index s")
        self.assertIn("TeleportService:Teleport(game.PlaceId, player)", handler, "mat fallback teleport")

    # ---- Regression BUG-002: script.js S.FetchServers loi mang/JSON ----
    def test_bug002_fetchservers_guarded(self):
        t = read("script.js")
        i = t.index("function S.FetchServers")
        body = t[i:i + 700]
        self.assertIn("pcall(function() return HttpService:JSONDecode(game:HttpGet(url)) end)", body,
                      "BUG-002 tai phat: HttpGet/JSONDecode chua boc pcall")
        self.assertIn("return {}, nil", body)

    def test_luau_parse_if_available(self):
        exe = os.environ.get("LUAU_ANALYZE") or ("/tmp/luau-build/luau-0.742/build/release/luau-analyze"
              if Path("/tmp/luau-build/luau-0.742/build/release/luau-analyze").exists() else None)
        if not exe: self.skipTest("khong co luau-analyze (dat LUAU_ANALYZE=...)")
        for fn in FILES:
            r = subprocess.run([exe, "--formatter=gnu", "--mode=nonstrict", fn],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
            self.assertNotIn("SyntaxError", r.stdout + r.stderr, f"{fn}: loi cu phap Luau")

    def test_luau_unit_fetchservers_if_available(self):
        """Chay that ham S.FetchServers (trich tu script.js) bang Luau: loi mang, JSON hong, hop le."""
        exe = os.environ.get("LUAU") or ("/tmp/luau-build/luau-0.742/build/release/luau"
              if Path("/tmp/luau-build/luau-0.742/build/release/luau").exists() else None)
        if not exe: self.skipTest("khong co luau binary (dat LUAU=...)")
        src = read("script.js")
        fn_src = src[src.index("function S.FetchServers"):src.index("function S.ResetServer")]
        harness = """
local S = {}
local MODE = "err"
game = { PlaceId = 123, HttpGet = function(self, url) if MODE == "err" then error("net down") end return MODE end }
HttpService = { JSONDecode = function(self, s) if s == "GOOD" then return {data = {{id="a"}}, nextPageCursor = "c1"} end error("bad json") end }
""" + fn_src + """
MODE = "err";  local d, c = S.FetchServers(); assert(type(d) == "table" and #d == 0 and c == nil, "err case")
MODE = "BAD";  local d2, c2 = S.FetchServers(); assert(type(d2) == "table" and #d2 == 0 and c2 == nil, "bad json case")
MODE = "GOOD"; local d3, c3 = S.FetchServers(); assert(#d3 == 1 and d3[1].id == "a" and c3 == "c1", "ok case")
print("LUAU_UNIT_FETCHSERVERS_OK")
"""
        with tempfile.NamedTemporaryFile("w", suffix=".luau", delete=False) as f:
            f.write(harness); path = f.name
        r = subprocess.run([exe, path], capture_output=True, text=True, timeout=60)
        self.assertIn("LUAU_UNIT_FETCHSERVERS_OK", r.stdout, r.stdout + r.stderr)

if __name__ == "__main__":
    unittest.main(verbosity=2)
