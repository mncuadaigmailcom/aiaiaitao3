// Sinh api_data.luau (danh sách class / thuộc tính / sự kiện / enum của Roblox)
// từ API-Dump.json để mock kiểm tra script dùng đúng API thật.
// Dùng: node gen_api.js <API-Dump.json> <out.luau>
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(src, 'utf8'));
const q = (s) => JSON.stringify(s);
let out = 'return {\nclasses = {\n';
for (const c of d.Classes) {
  out += `[${q(c.Name)}] = { super = ${q(c.Superclass)}, notCreatable = ${!!(c.Tags || []).includes('NotCreatable')}, props = {`;
  for (const m of c.Members) if (m.MemberType === 'Property') {
    const ro = (m.Tags || []).includes('ReadOnly');
    out += `[${q(m.Name)}] = { t = ${q(m.ValueType.Name)}, cat = ${q(m.ValueType.Category)}, ro = ${ro} },`;
  }
  out += '}, events = {';
  for (const m of c.Members) if (m.MemberType === 'Event') out += `[${q(m.Name)}] = true,`;
  out += '}, funcs = {';
  for (const m of c.Members) if (m.MemberType === 'Function' || m.MemberType === 'Callback') out += `[${q(m.Name)}] = true,`;
  out += '} },\n';
}
out += '},\nenums = {\n';
for (const e of d.Enums) out += `[${q(e.Name)}] = {` + e.Items.map((i) => `[${q(i.Name)}]=${i.Value}`).join(',') + '},\n';
out += '}\n}\n';
fs.writeFileSync(dst, out);
