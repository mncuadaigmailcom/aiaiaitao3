#!/usr/bin/env node
'use strict';
/**
 * doors-entity-radar/tools/gen-catalog-doc.js
 *
 * SINH TỰ ĐỘNG docs/danh-muc-thuc-the.md TỪ CHÍNH DỮ LIỆU trong
 * src/Shared/EntityCatalog.luau (chạy thật trong máy ảo Lua, không gõ tay).
 *
 * Lý do phải sinh tự động: tài liệu viết tay sẽ LỆCH khỏi dữ liệu ngay lần sửa
 * danh mục đầu tiên, và người dùng sẽ tin vào bảng cũ. Sinh từ nguồn thì bảng
 * trong docs luôn khớp 100% với những gì mã nguồn thật đang dò.
 *
 * Chạy: npm run docs
 */

const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../tests/lib/runtime');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'danh-muc-thuc-the.md');

const KIND_LABEL = {
  entity: 'thực thể',
  npc: 'NPC',
  event: 'sự kiện',
  environment: 'môi trường',
  player_state: 'trạng thái người chơi',
  unverified: 'chưa xác minh',
};

function main() {
  const h = createRuntime();

  // Trả về MỘT chuỗi (không trả bảng lồng nhau sang JS — tránh tràn stack).
  const payload = h.eval(`
    local Catalog = __DER_REQ("Shared/EntityCatalog")
    local Areas = __DER_REQ("Shared/Areas")
    local lines = {}
    lines[#lines + 1] = "#META|" .. Catalog.Count() .. "|" .. Catalog.CountMemberships() .. "|" .. Areas.Count()
    for _, area in ipairs(Areas.List) do
      lines[#lines + 1] = "#AREA|" .. area.id .. "|" .. area.name .. "|" .. area.short
    end
    for _, entry in ipairs(Catalog.List) do
      local areas = table.concat(entry.areas, "+")
      local patterns = table.concat(entry.detect.patterns, "+")
      lines[#lines + 1] = table.concat({
        entry.id, entry.name, areas, entry.kind, tostring(entry.kindConfirmed),
        entry.detect.method, entry.detect.matchMode or "exact", patterns,
        tostring(entry.detect.aliasOf), entry.notes,
      }, "|")
    end
    return table.concat(lines, "\\n")
  `)[0];

  const rows = String(payload).split('\n');
  const areas = [];
  const entries = [];
  let meta = null;
  for (const row of rows) {
    const parts = row.split('|');
    if (parts[0] === '#META') meta = { count: parts[1], memberships: parts[2], areaCount: parts[3] };
    else if (parts[0] === '#AREA') areas.push({ id: parts[1], name: parts[2], shortName: parts[3] });
    else entries.push({
      id: parts[0], name: parts[1], areas: parts[2].split('+'), kind: parts[3],
      kindConfirmed: parts[4] === 'true', method: parts[5], matchMode: parts[6],
      patterns: parts[7] === '' ? [] : parts[7].split('+'),
      aliasOf: parts[8] === 'nil' ? null : parts[8], notes: parts[9] || '',
    });
  }

  const methodLabel = (m) => (m === 'scan' ? 'quét tên instance' : m === 'unsupported' ? 'không hỗ trợ' : m);

  let md = `<!-- TỆP SINH TỰ ĐỘNG bởi tools/gen-catalog-doc.js — ĐỪNG SỬA TAY.
     Nguồn dữ liệu: src/Shared/EntityCatalog.luau. Sửa danh mục thì chạy: npm run docs -->

# Danh mục thực thể DOORS — Doors Entity Radar

Số mục: **${meta.count}** · số cặp (mục, khu vực): **${meta.memberships}** · số khu vực: **${meta.areaCount}**

> **ĐỌC TRƯỚC KHI TIN BẢNG NÀY.** "Có trong danh mục" KHÔNG có nghĩa là
> "định vị được trong game". Danh mục là phần THÔNG TIN (tên, khu vực, ghi chú)
> và chỉ những mục có \`method = quét tên instance\` **cùng mẫu tên đã được bạn
> xác minh trong game của mình** mới có thể hiện "Đã phát hiện" + khoảng cách.
> Mọi mục khác hiển thị đúng trạng thái thật của nó: *Không phát hiện*,
> *Không hỗ trợ phát hiện*, hoặc *Chưa xác minh* — radar không bao giờ suy đoán.

## Khu vực

| id | tên | viết tắt |
| --- | --- | --- |
${areas.map((a) => `| \`${a.id}\` | ${a.name} | ${a.shortName} |`).join('\n')}

## Toàn bộ danh mục

| id | tên hiển thị | khu vực | loại | cơ chế | mẫu tên đang dò | biến thể của | ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
`;

  for (const e of entries) {
    const kindText = KIND_LABEL[e.kind] || e.kind;
    const kindTextFull = e.kindConfirmed ? kindText : `${kindText} (chưa xác minh)`;
    const patterns = e.patterns.length > 0
      ? e.patterns.map((p) => `\`${p}\``).join(', ') + (e.matchMode === 'contains' ? ' *(chứa)*' : '')
      : '—';
    md += `| \`${e.id}\` | ${e.name} | ${e.areas.join(', ')} | ${kindTextFull} | ${methodLabel(e.method)} | ${patterns} | ${e.aliasOf ? `\`${e.aliasOf}\`` : '—'} | ${e.notes} |\n`;
  }

  const byMethod = entries.reduce((acc, e) => { acc[e.method] = (acc[e.method] || 0) + 1; return acc; }, {});
  const aliasCount = entries.filter((e) => e.aliasOf !== null).length;

  md += `
## Thống kê

| cơ chế | số mục |
| --- | --- |
${Object.keys(byMethod).sort().map((m) => `| ${methodLabel(m)} | ${byMethod[m]} |`).join('\n')}
| có \`aliasOf\` (chỉ là chú thích) | ${aliasCount} |

## Quy tắc khớp tên (quan trọng)

1. Tên instance được **chuẩn hoá**: chữ thường, chỉ giữ \`a-z0-9\` (\`A-60 (Room 3)\` → \`a60room3\`).
2. Mặc định là **khớp chính xác** theo khoá đã chuẩn hoá.
3. Một số mục dùng **khớp "chứa"** (đánh dấu *(chứa)*) vì tên thật trong game
   thường có hậu tố/số phòng.
4. \`aliasOf\` **KHÔNG** dùng để mượn mẫu tên. Một instance tên \`Rush\` chỉ kết
   luận về Rush; \`RNIUSHCg==\` chỉ được kết luận khi trong Workspace có
   instance khớp mẫu \`rniushcg\`. Lý do: báo sai số lượng thực thể còn tệ hơn
   là không báo.
5. Muốn thêm mẫu tên cho một mục, thêm vào \`Detection.extraPatterns\` trong
   \`Shared/Config.luau\` — **sau khi bạn tự thấy tên đó trong game** (Explorer
   hoặc lệnh in ở \`docs/kiem-thu.md\`).
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`Đã sinh ${path.relative(ROOT, OUT)} — ${entries.length} mục, ${areas.length} khu vực.`);
}

main();
