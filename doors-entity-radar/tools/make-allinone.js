'use strict';
/**
 * doors-entity-radar/tools/make-allinone.js
 *
 * Sinh MỘT tệp Markdown duy nhất chứa TOÀN BỘ dự án:
 *   - hướng dẫn cài đặt + cách kiểm tra
 *   - mã nguồn NGUYÊN VĂN của cả 23 module (không lược bỏ, không dùng "...")
 *   - ba tệp tài liệu
 *
 * Mục đích: người dùng chỉ cần MỘT link là có tất cả. Tệp này sinh tự động
 * từ src/ và docs/ nên không bao giờ lệch với mã nguồn thật; chạy lại bằng
 * `npm run allinone` (hoặc `npm run check`, đã được móc vào).
 *
 * Chống suy giảm âm thầm: sau khi ghi, tool ĐỌC LẠI tệp và so từng module
 * từng byte với bản gốc — thiếu một ký tự là báo lỗi và thoát khác 0.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'TOAN-BO-MA-NGUON.md');

/** Loại script + vị trí đặt trong Roblox Studio của từng tệp nguồn. */
const PLACEMENT = {
  'Client/Bootstrap.luau': {
    kind: 'LocalScript',
    place: 'StarterPlayer > StarterPlayerScripts > DoorsEntityRadar',
    note: 'Điểm vào. Nếu bạn dùng bản gộp `bundle/` thì KHÔNG cần tệp này.',
  },
  'Server/Diagnostics.luau': {
    kind: 'Script (mặc định ENABLED = false)',
    place: 'ServerScriptService > DoorsEntityRadarServer > Diagnostics',
    note: 'Tuỳ chọn: in tên instance thật ra Output để bạn xác minh danh mục. Mặc định TẮT.',
  },
};

function defaultPlacement(rel) {
  const kind = 'ModuleScript';
  const place = rel.startsWith('Client/')
    ? 'ReplicatedStorage > DoorsEntityRadar > Client (giữ nguyên cấu trúc thư mục con)'
    : 'ReplicatedStorage > DoorsEntityRadar > Shared';
  return { kind, place, note: 'Được nạp bằng `require()` qua RequireShim.' };
}

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.name.endsWith('.luau')) out.push(rel);
  }
  return out;
}

/** Hàng rào code đủ dài để không bị nguồn chứa ``` phá vỡ. */
function fenceFor(source) {
  let len = 3;
  while (source.includes('`'.repeat(len))) len += 1;
  return '`'.repeat(len);
}

function section(title, body) {
  return `## ${title}\n\n${body}\n`;
}

function main() {
  const modules = walk(SRC);
  const parts = [];

  parts.push(`# DOORS ENTITY RADAR — TOÀN BỘ MÃ NGUỒN (1 tệp, 1 link)

Tệp này chứa **toàn bộ** dự án để bạn không phải mở nhiều link:
hướng dẫn cài đặt, mã nguồn nguyên văn của **${modules.length} module**, và tài liệu.

* Sinh tự động bởi \`doors-entity-radar/tools/make-allinone.js\` — đừng sửa tay,
  hãy sửa trong \`src/\` rồi chạy \`npm run allinone\`.
* **Không có dấu \`...\` nào**: mọi tệp được chép nguyên văn từng byte.

---

## 0. Cài nhanh (khuyên dùng — 1 tệp duy nhất)

Không muốn tạo 23 ModuleScript? Dùng bản gộp:
\`doors-entity-radar/bundle/doors-entity-radar.luau\` (${modules.length} module nằm bên trong).

1. Roblox Studio → \`StarterPlayer\` → \`StarterPlayerScripts\` → Insert Object → **LocalScript**, tên \`DoorsEntityRadar\`.
2. Mở tệp bundle, chọn **toàn bộ**, dán đè vào LocalScript đó.
3. **Play**. Output phải có dòng:
   \`[DER] [INFO] Sẵn sàng: Hệ thống đang chạy. Tự kiểm tra: ĐẠT — 16 hạng mục, 0 lỗi, N cảnh báo.\`
4. \`F2\` để ẩn/hiện bảng.

Muốn dùng bản nhiều tệp (dễ sửa từng module) thì theo **mục 1** dưới đây.

---
`);

  parts.push(section('1. Mã nguồn — loại script và vị trí đặt trong Studio', [
    '| Tệp | Loại | Vị trí trong Studio | Ghi chú |',
    '| --- | --- | --- | --- |',
    ...modules.map((rel) => {
      const info = PLACEMENT[rel] || defaultPlacement(rel);
      return `| \`src/${rel}\` | ${info.kind} | \`${info.place}\` | ${info.note} |`;
    }),
    '',
    'Bản gộp `bundle/doors-entity-radar.luau` là **LocalScript** đặt ở',
    '`StarterPlayer > StarterPlayerScripts > DoorsEntityRadar`.',
    '',
    '`default.project.json` (Rojo) đã map sẵn các vị trí trên.',
  ].join('\n')));

  parts.push('---\n\n## 2. Mã nguồn nguyên văn từng tệp\n');
  for (const rel of modules) {
    const source = fs.readFileSync(path.join(SRC, rel), 'utf8');
    const info = PLACEMENT[rel] || defaultPlacement(rel);
    const fence = fenceFor(source);
    parts.push([
      `### \`src/${rel}\` — ${info.kind}`,
      '',
      `Vị trí: \`${info.place}\``,
      '',
      `${fence}lua`,
      source.replace(/\s+$/, ''),
      fence,
      '',
    ].join('\n'));
  }

  for (const doc of ['README.md', 'docs/cai-dat.md', 'docs/kiem-thu.md', 'docs/danh-muc-thuc-the.md']) {
    const abs = path.join(ROOT, doc);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    parts.push(`---\n\n## 3. Tài liệu — \`${doc}\`\n`);
    parts.push(`${fenceFor(text)}markdown\n${text.replace(/\s+$/, '')}\n${fenceFor(text)}\n`);
  }

  const content = `${parts.join('\n')}\n`;
  fs.writeFileSync(OUT, content);

  // ---- Kiểm chứng: đọc lại và so từng byte với bản gốc ----
  const written = fs.readFileSync(OUT, 'utf8');
  let failures = 0;
  for (const rel of modules) {
    const source = fs.readFileSync(path.join(SRC, rel), 'utf8').replace(/\s+$/, '');
    if (!written.includes(source)) {
      console.error(`  LỖI  ${rel}: nội dung trong tệp tổng hợp không khớp bản gốc.`);
      failures += 1;
    }
  }
  for (const rel of modules) {
    if (!written.includes(`### \`src/${rel}\``)) {
      console.error(`  LỖI  thiếu mục cho ${rel}.`);
      failures += 1;
    }
  }

  const kb = (Buffer.byteLength(content) / 1024).toFixed(1);
  const lines = content.split('\n').length;
  console.log(`Đã sinh TOAN-BO-MA-NGUON.md — ${modules.length} module, ${lines} dòng, ${kb} KB`);
  if (failures > 0) {
    console.error(`✗ ${failures} chỗ không khớp — KHÔNG dùng tệp này.`);
    process.exitCode = 1;
  } else {
    console.log('✓ Đã đối chiếu từng module: nội dung khớp nguyên văn.');
  }
}

main();
