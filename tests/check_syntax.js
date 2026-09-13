// Kiểm tra cú pháp toàn bộ file hub (Luau) bằng luaparse + tiền xử lý toán tử += của Luau.
// cách dùng: node tests/check_syntax.js [đường-dẫn-file]   (mặc định: file hub ở thư mục gốc repo)
const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const file = process.argv[2] || path.join(__dirname, "..", "aiaiaitao3");
let src = fs.readFileSync(file, "utf8");

const STOP = "\\b(?:then|else|elseif|end|do|break|return|local|function|for|while|if|repeat|until)\\b";
const lhs = "[A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*";
const rhs = "(?:(?!" + STOP + ")[^;\\n])+";
src = src.replace(new RegExp("\\b(" + lhs + ")\\s*([-+*/]|//)=\\s*(" + rhs + ")", "g"),
  (m, l, op, r) => `${l} = ${l} ${op === "//" ? "/" : op} (${r.trim()})`);

try {
  luaparse.parse(src, { luaVersion: "5.3", wait: false });
  console.log("✅ cú pháp OK: " + path.relative(process.cwd(), file));
} catch (e) {
  const msg = e.message || String(e);
  console.error("❌ LỖI CÚ PHÁP: " + msg);
  const mm = msg.match(/\[(\d+):(\d+)\]/);
  if (mm) {
    const ln = parseInt(mm[1], 10);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = Math.max(0, ln - 3); i < Math.min(lines.length, ln + 2); i++) {
      console.log(`  ${i + 1 === ln ? ">>" : "  "} ${i + 1}: ${lines[i]}`);
    }
  }
  process.exit(1);
}
