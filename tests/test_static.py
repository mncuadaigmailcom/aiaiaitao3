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

class TestVirtualButtonsAndSpy(unittest.TestCase):
    """Hoi quy: nut ao bay len/xuong + SimpleSpy link moi (script.js1.js)."""
    def setUp(self): self.t = read("script.js1.js")

    def test_simplespy_new_link_only(self):
        self.assertIn('loadstring(game:HttpGetAsync("https://raw.githubusercontent.com/78n/SimpleSpy/main/SimpleSpyBeta.lua"))()', self.t)
        self.assertNotIn("ex-serum/SimpleSpy", self.t)
        self.assertIn("SimpleSpy", self.t)  # tinh nang con nguyen

    def test_fly_hud_updown_preserved_and_token_holds(self):
        self.assertIn('hold("FlyUp", "⬆"', self.t)
        self.assertIn('hold("FlyDown", "⬇"', self.t)
        # hold key theo button + token luu input (tha tay ngoai nut van xoa dung)
        self.assertIn("FL.holds[b] = { input = input, X = axis.X, Y = axis.Y, Z = axis.Z }", self.t)
        self.assertIn("matches(held.input, input, false)", self.t)
        self.assertNotIn("FL.holds[input] = axis", self.t)

    def test_safe_hud_updown_global_release(self):
        self.assertIn('vBtn("⬆"', self.t); self.assertIn('vBtn("⬇"', self.t)
        self.assertIn("SF._virtYInput, SF._virtYAt = inp, os.clock()", self.t)
        self.assertIn("inp == SF._virtYInput", self.t)
        # cham nhanh van nudge 2.5 (giu nguyen tinh nang), giu lau khong bi nay them
        self.assertIn("(os.clock() - (SF._virtYAt or 0)) < 0.35", self.t)
        self.assertIn("MV.Nudge(2.5)", self.t); self.assertIn("MV.Nudge(-2.5)", self.t)

    def test_luau_unit_fly_updown_if_available(self):
        """Chay that MV._ReadFlyInput + MV.FlyVelocity (trich tu script.js1.js) bang Luau:
        giu ⬆ -> Y=+1 -> van toc +50; giu ⬇ -> -50; tha nut -> dung."""
        exe = os.environ.get("LUAU") or ("/tmp/luau-build/luau-0.742/build/release/luau"
              if Path("/tmp/luau-build/luau-0.742/build/release/luau").exists() else None)
        if not exe: self.skipTest("khong co luau binary (dat LUAU=...)")
        src = self.t
        clamp = src[src.index("local function mvClamp"):src.index("function MV.Char")]
        clamp = clamp[:clamp.rindex("end") + 3].replace("local function mvClamp", "function mvClamp", 1)
        body = src[src.index("function MV._ReadFlyInput"):src.index("function MV._FlyStep")]
        harness = r'''
local VMT; local function V(x,y,z) local m=math.sqrt(x*x+y*y+z*z) return setmetatable({X=x,Y=y,Z=z,Magnitude=m},VMT) end
VMT={__add=function(a,b) return V(a.X+b.X,a.Y+b.Y,a.Z+b.Z) end,__sub=function(a,b) return V(a.X-b.X,a.Y-b.Y,a.Z-b.Z) end,
__mul=function(a,b) if type(a)=="number" then a,b=b,a end return V(a.X*b,a.Y*b,a.Z*b) end,
__div=function(a,b) return V(a.X/b,a.Y/b,a.Z/b) end,
__index=function(t,k) if k=="Unit" then local m=t.Magnitude if m>0 then return V(t.X/m,t.Y/m,t.Z/m) end return V(0,0,0) end end}
Vector3={new=V, zero=V(0,0,0)}
UserInputService={IsKeyDown=function() return false end, GetFocusedTextBox=function() return nil end}
Enum={KeyCode={W=1,S=2,A=3,D=4,Space=5,LeftShift=6,LeftControl=7}}
FL={x=0,z=0,y=0,holds={},focused=true,joyInput=nil}
local MV={}
''' + clamp + "\n" + body + r'''
local cf={RightVector=Vector3.new(1,0,0), LookVector=Vector3.new(0,0,-1)}
local btn, inp = {}, {}
assert(MV._ReadFlyInput(cf,nil).Y==0, "idle")
FL.holds[btn]={input=inp,X=0,Y=1,Z=0}
assert(MV._ReadFlyInput(cf,nil).Y==1, "up hold")
assert(MV.FlyVelocity(cf,MV._ReadFlyInput(cf,nil),50).Y==50, "up vel")
FL.holds[btn]={input=inp,X=0,Y=-1,Z=0}
assert(MV._ReadFlyInput(cf,nil).Y==-1, "down hold")
assert(MV.FlyVelocity(cf,MV._ReadFlyInput(cf,nil),50).Y==-50, "down vel")
FL.holds[btn]=nil
assert(MV._ReadFlyInput(cf,nil).Y==0, "release")
print("LUAU_UNIT_FLY_UPDOWN_OK")
'''
        with tempfile.NamedTemporaryFile("w", suffix=".luau", delete=False) as f:
            f.write(harness); path = f.name
        r = subprocess.run([exe, path], capture_output=True, text=True, timeout=60)
        self.assertIn("LUAU_UNIT_FLY_UPDOWN_OK", r.stdout, r.stdout + r.stderr)

class TestServerJoinByCode(unittest.TestCase):
    """Hoi quy BUG-005: nhap ma server nguoi choi o Script Hub hop khong duoc."""
    def setUp(self): self.t = read("script.js1.js")

    def test_locate_job_place_wired(self):
        self.assertIn("function S.LocateJobPlace(jobId)", self.t)
        self.assertIn("pId = S.LocateJobPlace(jId)", self.t)
        # hop noi bo ghi cache Place hien tai trong TryJoinCandidates -> khong cham, giu nguyen hanh vi
        self.assertIn("S._jobPlaceCache[pick.id] = tonumber(game.PlaceId)", self.t)
        self.assertIn("function S.TryJoinCandidates(cand)", self.t)
        # tinh nang cu con nguyen
        for k in ["HubServer_JobInput", "function S.JoinServer", "function S.ParseServerCode", "TeleportToPlaceInstance"]:
            self.assertIn(k, self.t)

    def test_teleport_fail_not_silent(self):
        self.assertIn("Không vào được server này (", self.t)
        self.assertIn("Đã tự canh 25 lần", self.t)
        self.assertIn("S.StartAutoJoinQueue", self.t)  # canh slot khi day van con

    def test_luau_unit_join_chain_if_available(self):
        exe = os.environ.get("LUAU") or ("/tmp/luau-build/luau-0.742/build/release/luau"
              if Path("/tmp/luau-build/luau-0.742/build/release/luau").exists() else None)
        if not exe: self.skipTest("khong co luau binary (dat LUAU=...)")
        seg = self.t[self.t.index("function S.ParseServerCode"):self.t.index("function S.HopServer")]
        seg = seg.replace("_G.BananaCatHub_PlayerInfo", "PISTUB")  # _G bi dong bang trong Luau CLI, chi thay o ban test
        harness = r'''
local TP, fetchCalls = nil, 0
local S = {_jobPlaceCache={}, _jobMetaCache={}}
game = {PlaceId=111, JobId="self-job"}
player = {}
GuiService = {ClearError=function() end}
TeleportService = { TeleportToPlaceInstance=function(self,p,j,pl) TP={p,j} end,
  Teleport=function(self,p,pl) TP={p,nil} end,
  TeleportInitFailed={Connect=function(self,fn) return {Disconnect=function() end} end} }
trackConn = function(c) return c end
ReleaseHubFocus = function() end
D = {Say=function() end}
C = {YELLOW=1, RED=2}
PISTUB = { GetUniversePlaces=function(a,b) return {111,222} end }
''' + seg + r'''
local U="123e4567-e89b-12d3-a456-426614174000"
S.FetchServers = function(cur, p) fetchCalls = fetchCalls + 1
  if p == 222 then return {{id=U}}, nil end return {{id="other-server"}}, nil end
-- 1) chi co JobId, server o sub-place 222 -> phai tim ra Place 222 (truoc day mac dinh 111 nen that bai)
TP=nil; local m1 = S.JoinServer(U); assert(TP and TP[1]==222 and TP[2]==U, "case1 "..tostring(TP and TP[1]))
-- 2) da co cache -> khong quet tim Place nua (hop noi bo khong cham)
local U2="223e4567-e89b-12d3-a456-426614174000"; S._jobPlaceCache[U2]=111; fetchCalls=0; TP=nil
S.JoinServer(U2); assert(TP and TP[1]==111 and fetchCalls==0, "case2 cache")
-- 3) ma kem san Place "222:U" -> dung ngay, khong tim
TP=nil; S.JoinServer("222:"..U); assert(TP and TP[1]==222, "case3 explicit")
-- 4) khong tim thay o dau -> giu hanh vi cu: vao bang Place hien tai
local U3="323e4567-e89b-12d3-a456-426614174000"; TP=nil
S.JoinServer(U3); assert(TP and TP[1]==111 and TP[2]==U3, "case4 fallback")
-- 5) ma rac -> bao loi ro rang, khong teleport
TP=nil; local okE = pcall(function() return S.JoinServer("!!!") end)
assert(not okE and TP==nil, "case5 invalid")
print("LUAU_UNIT_JOIN_CHAIN_OK")
'''
        with tempfile.NamedTemporaryFile("w", suffix=".luau", delete=False) as f:
            f.write(harness); path = f.name
        r = subprocess.run([exe, path], capture_output=True, text=True, timeout=60)
        self.assertIn("LUAU_UNIT_JOIN_CHAIN_OK", r.stdout, r.stdout + r.stderr)

class TestHop(unittest.TestCase):
    """Hoi quy BUG-006: tinh nang Hop (ngau nhien / it nguoi / sieu vang)."""
    def setUp(self): self.t = read("script.js1.js")

    def test_hop_button_always_hops(self):
        i = self.t.index("D.hubHopBtn.Activated")
        handler = self.t[i:i + 500]
        self.assertIn('S.RunHubAction("hopserver")', handler)
        self.assertNotIn("DoHubJoinByInput", handler, "BUG-006a: nut Hop lai vao theo ma con sot trong o nhap")
        # vao theo ma van con o nut Vao (khong mat tinh nang)
        self.assertIn("S.DoHubJoinByInput(D.hubJobIn and D.hubJobIn.Text)", self.t)
        for k in ["HubServer_HopBtn", "function S.HopServer", "function S.HopLowServer", "function S.HopEmptyServer", "function S.FetchServers"]:
            self.assertIn(k, self.t)

    def test_try_join_candidates(self):
        self.assertIn("function S.TryJoinCandidates(cand)", self.t)
        self.assertIn("math.min(3, #cand)", self.t)
        self.assertGreaterEqual(self.t.count("S.TryJoinCandidates("), 4)  # 1 dinh nghia + 3 cho dung

    def test_luau_unit_hop_if_available(self):
        exe = os.environ.get("LUAU") or ("/tmp/luau-build/luau-0.742/build/release/luau"
              if Path("/tmp/luau-build/luau-0.742/build/release/luau").exists() else None)
        if not exe: self.skipTest("khong co luau binary (dat LUAU=...)")
        seg = self.t[self.t.index("function S.GetJobId"):self.t.index("S.AntiBan = S.AntiBan or")]
        seg = seg.replace("_G.BananaCatHub_PlayerInfo", "PISTUB")
        harness = r'''
local TP, TS = nil, nil
local S = {}
game = {PlaceId=111, JobId="selfjob-0000"}
player = {}
GuiService = {ClearError=function() end}
HttpService = {JSONDecode=function() error("unused") end}
TeleportService = { TeleportToPlaceInstance=function(self,p,j,pl) if j=="good-mid-01" then error("denied sync") end TP={p,j} end,
  Teleport=function(self,p,pl) TP={p,nil} end,
  TeleportInitFailed={Connect=function(self,fn) return {Disconnect=function() end} end} }
trackConn = function(c) return c end
ReleaseHubFocus = function() end
D = {Say=function() end}
C = {YELLOW=1, RED=2}
PISTUB = {}
task = {wait=function() end, delay=function() end, spawn=function(f) end}
''' + seg + r'''
-- FetchServers gia: trang 1 co server loi/het, trang 2 binh thuong
S.FetchServers = function(cur, p)
  if cur == "" then return {{id="selfjob-0000",playing=1,maxPlayers=10},{id="bad",playing=1,maxPlayers=10},
    {id="good-mid-01",playing=2,maxPlayers=10},{id="good-low-01",playing=1,maxPlayers=10}}, "c2" end
  return {{id="good-high-1",playing=9,maxPlayers=10}}, nil end
-- 1) Hop thuong: phai bo qua server loi va vao duoc server tot (khong dung lai o lan thu 1)
TP=nil; local m1 = S.HopServer(); assert(TP and TP[2]=="good-low-01", "hop: "..tostring(TP and TP[2]).." / "..tostring(m1))
-- 2) Hop it nguoi: chon nhom vang nhat va van vao duoc du 1 ung vien loi
TP=nil; local m2 = S.HopLowServer(); assert(TP and TP[2]=="good-low-01", "hoplow: "..tostring(TP and TP[2]))
-- 3) Hop sieu vang: co server <=3 nguoi -> vao server do
TP=nil; local m3 = S.HopEmptyServer(); assert(TP and TP[2]=="good-low-01", "hopempty: "..tostring(TP and TP[2]))
-- 4) Khong co server nao -> bao ro, khong teleport
S.FetchServers = function() return {}, nil end
TP=nil; local m4 = S.HopServer(); assert(TP==nil and m4:find("Không tìm thấy"), "hop empty list")
print("LUAU_UNIT_HOP_OK")
'''
        with tempfile.NamedTemporaryFile("w", suffix=".luau", delete=False) as f:
            f.write(harness); path = f.name
        r = subprocess.run([exe, path], capture_output=True, text=True, timeout=60)
        self.assertIn("LUAU_UNIT_HOP_OK", r.stdout, r.stdout + r.stderr)
