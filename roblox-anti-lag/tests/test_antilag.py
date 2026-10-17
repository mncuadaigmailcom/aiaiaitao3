"""Kiem thu du an Roblox Anti-Lag:
- Chay bo test Luau that (tests/run_tests.lua) bang trinh thong dich Luau neu co.
- Kiem tra tinh: ma nguon khong chua hanh vi bi cam (sua do hoa/xoa vat the/sua co che choi),
  co day du co che bat buoc va tai lieu doi chieu."""
import os
import re
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(ROOT, "AntiLag.lua")
README = os.path.join(ROOT, "README.md")
LUAU = "/tmp/luau-build/luau-0.742/build/release/luau"
ANALYZE = "/tmp/luau-build/luau-0.742/build/release/luau-analyze"


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


class TestLuauRuntime(unittest.TestCase):
    def test_luau_unit_suite(self):
        if not os.path.exists(LUAU):
            self.skipTest("chua build Luau CLI")
        r = subprocess.run([LUAU, "roblox-anti-lag/tests/run_tests.lua"],
                           cwd=os.path.dirname(ROOT), capture_output=True, text=True, timeout=120)
        self.assertIn("ANTILAG_ALL_OK", r.stdout, r.stdout + r.stderr)
        self.assertNotIn("FAIL ", r.stdout)

    def test_mock_roblox_toast(self):
        """Ghep AntiLag.lua vao moi truong Roblox mo phong va chay that:
        toast phai tao dung cau truc + tu bien mat sau 30 giay."""
        if not os.path.exists(LUAU):
            self.skipTest("chua build Luau CLI")
        mock = read(os.path.join(ROOT, "tests", "mock_roblox_test.lua"))
        src = read(SRC_PATH)
        combined = mock.replace("--__LOAD_ANTILAG__ (test_antilag.py se ghep ma nguon AntiLag.lua vao dung vi tri nay)",
                                "local AntiLag = (function()\n" + src + "\nend)()")
        tmp = os.path.join(ROOT, "tests", "_mock_combined.lua")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(combined)
        try:
            r = subprocess.run([LUAU, tmp], capture_output=True, text=True, timeout=120)
        finally:
            os.remove(tmp)
        self.assertIn("ANTILAG_MOCK_OK", r.stdout, r.stdout + r.stderr)
        self.assertNotIn("FAIL ", r.stdout)

    def test_luau_syntax(self):
        if not os.path.exists(ANALYZE):
            self.skipTest("chua build Luau CLI")
        r = subprocess.run([ANALYZE, SRC_PATH], capture_output=True, text=True, timeout=300)
        errors = [ln for ln in (r.stdout + r.stderr).splitlines() if "SyntaxError" in ln]
        self.assertEqual(errors, [], "\n".join(errors[:5]))


class TestSafetyContract(unittest.TestCase):
    """Hợp đồng an toàn (yeu cau muc 3): script khong duoc chua hanh vi bi cam."""

    @classmethod
    def setUpClass(cls):
        cls.src = read(SRC_PATH)
        # Bo comment de chi quet code thuc thi
        cls.code = re.sub(r"--\[\[.*?\]\]", "", cls.src, flags=re.S)
        cls.code = re.sub(r"--[^\n]*", "", cls.code)

    def test_no_forbidden_behaviors(self):
        forbidden = {
            "sua Lighting": r"Lighting\s*[.:]",
            "ghi thuoc tinh do hoa": r"(QualityLevel|Technology|GraphicsMode|ShadowQuality|GlobalShadows)\s*=",
            "tat bong do/anh sang": r"(CastShadow|GlobalShadows)\s*=\s*false",
            "an/xoa vat the game": r"(workspace|Workspace)\s*[.:]",
            "sua nhan vat/co che choi": r"(WalkSpeed|JumpPower|JumpHeight|Health)\s*=",
            "can thiep mang server": r"(FireServer|InvokeServer|FireAllClients|InvokeClient)\s*\(",
            "nut bam/menu tuong tac": r"Instance\.new\(\s*\"TextButton\"",
            "vong lap vo han": r"while\s+true\s+do",
        }
        for name, pat in forbidden.items():
            self.assertIsNone(re.search(pat, self.code), f"PHAT HIEN HANH VI BI CAM: {name}")

    def test_required_mechanisms_present(self):
        required = [
            "function Instance:Queue",        # phan bo viec / ngan sach frame
            "function Instance:Step",
            "function Instance:Connect",      # chong dang ky su kien trung
            "function Instance:DisconnectAll",
            "function Instance:CacheSet",     # cache co TTL + tran
            "function Instance:GetOrCompute",
            "function Instance:DefinePool",   # tai su dung doi tuong
            "function Instance:Debounce",
            "function Instance:Throttle",
            "function Instance:Guard",        # nen loi lap lai
            "function Instance:Request",      # gom request trung
            "function Instance:RunLimited",   # gioi han song song
            "function Instance:Sample",       # do hieu suat
            "function Instance:GetReport",
            "function AntiLag.Compare",       # so sanh truoc/sau
            "function Instance:Start",
            "function Instance:Destroy",      # don tai nguyen
            "detectRoblox",                   # kiem tra tuong thich
        ]
        for item in required:
            self.assertIn(item, self.src, f"THIEU CO CHE BAT BUOC: {item}")

    def test_only_toast_gui_allowed(self):
        # Ngoai le theo yeu cau nguoi dung: chi duoc tao toast thong bao,
        # khong nut bam/menu tuong tac; toast phai o goc phai duoi, vien cau vong,
        # trong xam trong suot, tu an sau mac dinh 30 giay.
        self.assertIn('RobloxInstance.new("ScreenGui")', self.src)
        self.assertNotIn('RobloxInstance.new("TextButton")', self.code)
        self.assertIn("AnchorPoint = Vector2.new(1, 1)", self.src)
        self.assertIn("BackgroundTransparency = 0.35", self.src)
        self.assertIn("toastDurationSec = 30", self.src)
        self.assertIn("function Instance:ShowToast", self.src)
        self.assertIn("function Instance:HideToast", self.src)

    def test_strong_mode_present(self):
        for item in ["function Instance:SetStrongMode", "function Instance:_maybeAutoStrong",
                     "strongBudgetMs = 1", "shed"]:
            self.assertIn(item, self.src, f"THIEU CHE DO MANH: {item}")

    def test_readme_covers_limitations(self):
        readme = read(README)
        self.assertIn("Giới hạn kỹ thuật", readme)
        for i in range(1, 15):
            self.assertRegex(readme, rf"\| {i} \|", f"README thieu doi chieu yeu cau so {i}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
