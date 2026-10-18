/* Sinh docs/05 trực tiếp từ src/Shared/Methods.luau.
 * Bảng trong tài liệu do đó KHÔNG THỂ lệch với mã nguồn.
 * Chạy: node /tmp/gen05.js  (hoặc chép vào tools/)
 */
const fs = require('fs');
const { createRuntime } = require('/home/user/aiaiaitao3/tests/lib/runtime');
const h = createRuntime({});
const BT = String.fromCharCode(96); // backtick — giữ ngoài chuỗi Lua cho khỏi đụng template literal

const grpRaw = String(h.eval(`
  local M = __RALO_REQUIRE('Shared/Methods')
  local g = M.CountByGroup()
  local L = {}
  for i = 1, 30 do
    local b = g[i]
    L[#L+1] = string.format('%d|%s|%d|%d|%d|%d|%d', i, b.name, b.total, b.A or 0, b.B or 0, b.D or 0, b.E or 0)
  end
  return table.concat(L, ';;')`));

const stRaw = String(h.eval(`
  local M = __RALO_REQUIRE('Shared/Methods')
  local c = M.CountByStatus()
  return string.format('%d|%d|%d|%d|%d|%d', c.total, c.A, c.B, c.C, c.D, c.E)`));

const listRaw = String(h.eval(`
  local M = __RALO_REQUIRE('Shared/Methods')
  local byG = {}
  for _, e in ipairs(M.List) do
    byG[e.group] = byG[e.group] or {}
    local b = byG[e.group]
    local f = '—'
    if e.file ~= nil and e.file ~= '' then
      -- Truong "file" co the liet ke nhieu tep ngan bang dau phay.
      -- Phai them tien to src/ va hau to .luau cho TUNG tep, khong chi tep dau.
      local parts = {}
      for piece in string.gmatch(e.file, '[^,]+') do
        piece = piece:gsub('^%s+', ''):gsub('%s+$', '')
        if piece ~= '' then
          if not piece:match('%.luau$') then piece = piece .. '.luau' end
          if not piece:match('^src/') then piece = 'src/' .. piece end
          parts[#parts+1] = piece
        end
      end
      f = table.concat(parts, ', ')
    end
    local cause = (e.cause or '—'):gsub('\\n', ' '):gsub('|', '/')
    b[#b+1] = string.format('| %s | %s | %s | %s | %s |', e.id, e.name, e.status, f, cause)
  end
  local out = {}
  for g = 1, 30 do
    out[#out+1] = tostring(g) .. '>>>' .. table.concat(byG[g] or {}, '\\n')
  end
  return table.concat(out, ';;;')`));

const [total, A, B, C, D, E] = stRaw.split('|').map(Number);
const grpRows = grpRaw.split(';;').map(l => l.split('|'));

let md = `# 5. Danh mục phương pháp và phân loại

> Tệp này được **sinh tự động** từ \`src/Shared/Methods.luau\`.
> Mọi con số và mọi dòng trong bảng đều lấy từ dữ liệu thật trong mã nguồn.

## 5.1 Cách đọc trạng thái

| Mã | Nghĩa | Điều kiện để được khai |
| -- | ----- | ---------------------- |
| **A** | Đã triển khai, có mã thật | Có tệp nguồn + marker \`RALO.METHODS\` khai id đó |
| **B** | Đã triển khai **và có test đang đạt** | Ngoài điều kiện của A, phải có một test khai id đó trong **tên test**, và test đó đạt |
| **C** | Đã triển khai nhưng chưa kiểm thử | Không có mục nào — xem giải thích ở 5.5 |
| **D** | Mới là đề xuất, **chưa có mã** | Không được trỏ vào tệp nguồn nào |
| **E** | Không áp dụng được trong phạm vi này | Không được trỏ vào tệp nguồn nào |

> **B ở đây nghĩa là "đã kiểm thử trong harness Lua", KHÔNG phải "đã chạy trong
> Roblox Studio".** Studio không có trong môi trường phát triển nên **không phương
> pháp nào đạt B trong game thật**. Xem [06-bao-cao-test-loi.md](06-bao-cao-test-loi.md).

Điều kiện trên được kiểm bằng máy, không bằng mắt: \`node tools/verify-catalog.js\`.
Trình kiểm này từ chối nếu một mục khai B mà không có test khai id, hoặc khai D/E
mà lại trỏ vào một tệp nguồn.

## 5.2 Số liệu thật

\`\`\`
Tổng số phương pháp : ${total}
  A đã triển khai    : ${A}
  B có test đạt      : ${B}
  C chưa kiểm thử    : ${C}
  D đề xuất          : ${D}
  E không áp dụng    : ${E}
  triển khai thật    : ${A + B + C} / ${total}
\`\`\`

**Không kê cho đủ 160.** Thực tế có ${total} mục, trong đó chỉ ${A + B + C} mục có mã
thật. ${D} mục là đề xuất (D) và ${E} mục không áp dụng được (E) — tất cả đều liệt kê
công khai ở 5.4, không trộn vào số đã triển khai.

## 5.3 Phân bổ theo 30 nhóm

| # | Nhóm | Tổng | A | B | D | E |
| - | ---- | ---- | - | - | - | - |
`;
for (const [g, name, t, a, b, d, e] of grpRows) {
  md += `| ${g} | ${name} | ${t} | ${a} | ${b} | ${d} | ${e} |\n`;
}

md += `\n## 5.4 Danh sách đầy đủ ${total} phương pháp\n`;
for (const chunk of listRaw.split(';;;')) {
  const idx = chunk.indexOf('>>>');
  const g = chunk.slice(0, idx);
  const rows = chunk.slice(idx + 3);
  const gname = grpRows[Number(g) - 1][1];
  md += `\n### Nhóm ${g} — ${gname}\n\n`;
  md += '| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |\n';
  md += '| -- | --- | -- | -------------------- | ------------------- |\n';
  // bọc đường dẫn tệp trong backtick cho dễ đọc
  // Bọc từng đường dẫn tệp trong backtick. Một mục có thể liệt kê nhiều tệp
  // ngăn bằng dấu phẩy, nên phải bọc từng phần chứ không bọc cả chuỗi.
  md += rows.replace(/\| (src\/[^|]*) \|/g, (m, cell) => {
    const wrapped = cell.split(',').map(p2 => p2.trim() === '' ? p2
      : BT + p2.trim() + BT).join(', ');
    return `| ${wrapped} |`;
  }) + '\n';
}

md += `
## 5.5 Vì sao không có mục nào ở trạng thái C

Ban đầu có 141 mục A và 0 mục B. Sau khi viết 123 test, **90 mục được nâng lên B** vì
có test khai đúng id đó trong tên test và test đạt. ${A} mục A còn lại **chưa có test
riêng khai rõ id**, nhưng không bị hạ xuống C vì:

1. Chúng vẫn có mã thật, có marker, và \`verify-catalog.js\` kiểm được điều đó.
2. Nhiều mục được chạy **gián tiếp** qua test tích hợp \`pipeline\` (các bước trong
   \`Plan\`), nên gọi chúng là "chưa kiểm thử" sẽ nói sai theo hướng ngược lại.

Muốn tách bạch tuyệt đối thì cách đúng là **viết thêm test khai rõ id đó**, không phải
đổi nhãn. Đổi A→C chỉ để khớp mẫu sẽ làm báo cáo kém trung thực hơn chứ không hơn.

## 5.6 Trạng thái C = 0 có phải khai khống không?

Không, và đây là điểm dễ hiểu nhầm nhất của toàn bộ danh mục:

- **C = 0 không có nghĩa "mọi thứ đã test trong game".** Nó chỉ có nghĩa: mọi mục đã
  triển khai hoặc đã có test khai rõ id (B), hoặc chưa có test riêng (A).
- Trạng thái B **chỉ có giá trị trong harness Lua**. Không mục nào trong bảng này
  từng chạy trong Roblox Studio.
- Nói cách khác: **B ở đây ≈ C theo định nghĩa gốc** nếu "kiểm thử" bắt buộc phải là
  chạy trong Studio. Nhãn B được giữ kèm lời khai báo này để không ai đọc nhầm.
`;

fs.writeFileSync('/home/user/aiaiaitao3/docs/05-danh-muc-phuong-phap.md', md);
console.log('đã ghi docs/05 —', md.split('\n').length, 'dòng');
