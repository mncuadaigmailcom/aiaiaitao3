/* Script mẫu để thử AIA Secure Script.
 * Sau khi mã hoá, bấm "Chạy thử ngay" — kết quả sẽ hiện trong khung nhật ký.
 */
function greet(name) {
  return 'Xin chào ' + name + ' — đây là code đã được giải mã và chạy!';
}

var names = ['AIA', 'bạn', 'thế giới'];
for (var i = 0; i < names.length; i++) {
  console.log(greet(names[i]));
}
console.log('Thời điểm chạy:', new Date().toISOString());
console.log('Phép tính thử:', [1, 2, 3, 4].map(function (n) { return n * n; }).join(', '));
