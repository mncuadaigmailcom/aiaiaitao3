'use strict';
/**
 * tests/suites/objectlocator.test.js
 *
 * Chạy THẬT object-locator/ObjectLocator.lua trong máy ảo Lua 5.3 (fengari)
 * với mock Roblox API + đồng hồ ảo. Mỗi ca có runtime riêng.
 *
 * GIỚI HẠN: không phải Roblox Studio. Test chứng minh logic/ngân sách/vòng
 * đời GUI trên mock, KHÔNG chứng minh hành vi engine hay FPS thật.
 *
 * Chạy: npm test -- objectlocator
 */

const path = require('path');
const fs = require('fs');
const { LuaRuntime } = require('../../tools/test-harness/lua-runtime');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'object-locator', 'ObjectLocator.lua');
const CASES_PATH = path.join(ROOT, 'tests', 'fixtures', 'objectlocator', 'cases.lua');

const CASES = [
  ['CORE-001', 'Chuẩn hoá tên: bỏ dấu tiếng Việt, chữ hoa, khoảng trắng, ký tự đặc biệt'],
  ['CORE-002', 'Tách danh sách tên/path, dedupe, gộp mục ghim + ô tìm kiếm'],
  ['CORE-003', 'Phân giải path không phân biệt hoa/thường và dấu'],
  ['CORE-004', 'Khớp chuỗi con theo khoá, không dùng pattern Lua'],
  ['SCAN-001', 'Quét workspace theo ngân sách node/khung, không quét đồng bộ khi gõ'],
  ['SCAN-002', 'Sắp xếp theo khoảng cách, cắt maxItems, lọc maxDistance'],
  ['SCAN-003', 'Gộp part con vào Model/Folder cùng tên, không nhân đôi hiển thị'],
  ['SCAN-004', 'Path chưa tồn tại được giữ lại và thử lại (không hạ cấp thành tên)'],
  ['SCAN-005', 'Bỏ qua nhân vật người chơi, có công tắc tắt'],
  ['SCAN-006', 'Lỗi GetChildren / toạ độ hỏng không làm sập lượt quét'],
  ['SCAN-007', 'scanMs chỉ đo thời gian chạy, không đo thời gian chờ giữa các khung'],
  ['SCAN-008', 'Mất gốc toạ độ (spectate/freecam) không được lọc mù hay bịa 0m'],
  ['VIS-001', 'Một Highlight + Billboard cho mỗi vật, nhãn có tên/khoảng cách/toạ độ'],
  ['VIS-002', 'Công tắc hộp, màu, xuyên tường, nhãn áp dụng ngay và không nhân đôi'],
  ['VIS-003', 'Clear xoá sạch hiển thị và đặt lại slot; vật bị xoá được dọn'],
  ['VIS-004', 'Executor chặn Highlight/Billboard -> fallback SelectionBox, không crash'],
  ['CTRL-001', 'Bật/tắt, query rỗng, toggle, clearAll và trạng thái'],
  ['CTRL-002', 'Kẹp maxDistance/maxItems/màu, xử lý NaN và trần'],
  ['CTRL-003', 'Preset lưu/khôi phục đủ query + khoảng cách + màu + style; auto restore'],
  ['CTRL-004', 'Danh sách cập nhật khoảng cách khi người chơi di chuyển'],
  ['CTRL-005', 'Đi tới vật bằng Humanoid:MoveTo; từ chối khi thiếu nhân vật'],
  ['UI-001', 'Bảng UI tạo danh sách, bấm dòng để đi, đóng/mở, huỷ sạch'],
  ['STORE-001', 'Preset JSON: ghi/đọc qua lớp IO, tạo thư mục, giữ metadata'],
  ['STORE-002', 'Preset hỏng bị loại, số bị kẹp, entry trùng bị gộp'],
  ['UI-002', 'start()/stop() đăng ký đúng một instance, phím tắt bật/tắt'],
];

function makeRuntime() {
  const rt = new LuaRuntime();
  rt.setup({ parts: 0, emitters: 0 });
  rt.runFileAsGlobal(MODULE_PATH, 'OL');
  rt.runFileAsGlobal(CASES_PATH, 'CASES');
  return rt;
}

module.exports = function register(suite) {
  for (const [id, label] of CASES) {
    suite.test(`${id}: ${label}`, () => {
      const rt = makeRuntime();
      rt.run(`CASES.run(${JSON.stringify(id)})`, id);
    });
  }

  suite.test('STATIC-001: script chỉ dùng API công khai, không có hàm executor phá game', () => {
    const source = fs.readFileSync(MODULE_PATH, 'utf8');
    const banned = [
      'getrawmetatable', 'setreadonly', 'hookfunction', 'hookmetamethod',
      'checkcaller', 'getgenv', 'queue_on_teleport', 'firetouchinterest',
      'setrbxsetting', 'getconnections', 'syn.', 'KRNL_LOADED',
    ];
    for (const needle of banned) {
      if (source.includes(needle)) {
        throw new Error(`phát hiện API bị cấm trong ObjectLocator.lua: ${needle}`);
      }
    }
  });

  suite.test('STATIC-002: tự chạy chỉ khi ở Roblox thật (game là userdata)', () => {
    const source = fs.readFileSync(MODULE_PATH, 'utf8');
    if (!source.includes('type(game) == "userdata"')) {
      throw new Error('thiếu chốt phân biệt Roblox thật và máy ảo test');
    }
    if (!source.includes('return ObjectLocator')) {
      throw new Error('tệp phải return ObjectLocator để test/nạp lại');
    }
  });
};
