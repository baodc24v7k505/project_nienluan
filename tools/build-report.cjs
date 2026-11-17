// Rebuild the report from its editable Markdown source and verified screenshots.
// Run after the UI tests: node tools/build-report.cjs --pdf
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'docs/bao-cao');
const assets = path.join(reportDir, 'assets');
fs.mkdirSync(assets, { recursive: true });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const inline = value => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">${content}</g></svg>`;
}
function box(x, y, title, lines, width = 185, height = 88) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="#f1f5f9" stroke="#cbd5e1"/><text x="${x + width / 2}" y="${y + 26}" text-anchor="middle" font-size="17" font-weight="bold">${escape(title)}</text>${lines.map((line, i) => `<text x="${x + width / 2}" y="${y + 49 + i * 18}" text-anchor="middle" font-size="13">${escape(line)}</text>`).join('')}`;
}
function arrow(x1, y1, x2, y2, label, labelX = (x1 + x2) / 2, labelY = (y1 + y2) / 2 - 9) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1.7" marker-end="url(#arrow)"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="#475569">${escape(label)}</text>`;
}
fs.writeFileSync(path.join(assets, 'kien-truc.svg'), svg(920, 360,
  box(15, 45, 'Người dùng', ['Trình duyệt web', 'Máy tính hoặc điện thoại']) +
  box(250, 45, 'React Frontend', ['Vercel', 'Giao diện và cache']) +
  box(485, 45, 'NestJS API', ['Render', 'Nghiệp vụ và phân quyền']) +
  box(720, 45, 'PostgreSQL', ['Dữ liệu nghiệp vụ', 'MediaAsset']) +
  arrow(200, 87, 250, 87, 'HTTPS') + arrow(435, 87, 485, 87, 'HTTP JSON', 460, 53) + arrow(670, 87, 720, 87, 'Prisma') +
  box(485, 240, 'MoMo sandbox', ['Dịch vụ bên ngoài', 'Tạo link và callback']) + arrow(578, 133, 578, 240, 'Tạo yêu cầu / IPN', 660, 194) +
  '<text x="250" y="188" font-size="14">Socket.IO  Chat và thông báo</text><line x1="250" y1="203" x2="670" y2="203" stroke="#94a3b8" stroke-dasharray="6 5"/><text x="15" y="325" font-size="12" fill="#64748b">Database kiểm thử được tách riêng. MoMo online chưa hoàn tất nghiệm thu.</text>'
));
fs.writeFileSync(path.join(assets, 'du-lieu-thuong-mai.svg'), svg(920, 330,
  box(15, 25, 'User', ['Người mua hoặc seller']) + box(250, 25, 'Shop', ['Thuộc một seller']) + box(485, 25, 'Product', ['Thông tin hàng hóa']) + box(720, 25, 'ProductVariant', ['Giá và kho theo SKU']) +
  box(15, 215, 'Order', ['Một lần đặt hàng']) + box(250, 215, 'ShopOrder', ['Phần đơn của một shop']) + box(485, 215, 'OrderItem', ['Bản chụp dòng hàng']) + box(720, 215, 'Review', ['Sao, nhận xét và ảnh']) +
  arrow(200, 67, 250, 67, '0..1') + arrow(435, 67, 485, 67, '0..n') + arrow(670, 67, 720, 67, '1..n') +
  arrow(107, 113, 107, 215, '0..n', 135, 167) + arrow(342, 113, 342, 215, '0..n', 370, 167) + arrow(577, 113, 577, 215, '0..n', 605, 167) +
  arrow(200, 257, 250, 257, '1..n') + arrow(435, 257, 485, 257, '1..n') + arrow(670, 257, 720, 257, '0..1')
));
let sequence = '';
for (const [x, label] of [[90, 'Người mua'], [300, 'Frontend'], [510, 'NestJS API'], [720, 'PostgreSQL']]) {
  sequence += `<rect x="${x - 75}" y="15" width="150" height="46" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/><text x="${x}" y="44" text-anchor="middle" font-size="16" font-weight="bold">${label}</text><line x1="${x}" y1="61" x2="${x}" y2="560" stroke="#cbd5e1" stroke-dasharray="5 5"/>`;
}
for (const [a, b, y, label] of [
  [90, 300, 105, 'Chọn ảnh và nội dung'], [300, 510, 163, 'POST /media'], [510, 720, 221, 'Lưu ảnh có ownerId'],
  [510, 300, 279, 'Trả id và URL'], [300, 510, 337, 'POST /reviews và imageIds'], [510, 720, 395, 'Kiểm tra người mua và chủ ảnh'],
  [510, 720, 453, 'Tạo Review và ReviewImage'], [510, 300, 511, 'Thành công hoặc lỗi nghiệp vụ'],
]) sequence += arrow(a, y, b, y, label);
fs.writeFileSync(path.join(assets, 'trinh-tu-danh-gia.svg'), svg(810, 580, sequence));

const sources = {
  'product-desktop.png': 'san-pham.png',
  'review-composer-mobile.png': 'soan-danh-gia.png',
  'reviews-mobile.png': 'doc-danh-gia.png',
  'wishlist-mobile.png': 'yeu-thich.png',
  'admin-report.png': 'bao-cao-quan-tri.png',
};
for (const [source, destination] of Object.entries(sources)) {
  const from = path.join(root, 'frontend/test-results', source);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(assets, destination));
  else if (!fs.existsSync(path.join(assets, destination))) throw Error(`Missing verified screenshot: ${source}. Run npm run test:ui first.`);
}

const source = fs.readFileSync(path.join(reportDir, 'BAO_CAO_TIEU_LUAN.md'), 'utf8');
const [cover, body] = source.split('<!-- pagebreak -->');
if (!body) throw Error('Report cover separator missing');
function markdown(text) {
  const lines = text.split(/\r?\n/); let html = '', i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('```')) {
      const content = []; i++; while (i < lines.length && !lines[i].startsWith('```')) content.push(lines[i++]);
      html += `<pre><code>${escape(content.join('\n'))}</code></pre>`; i++; continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) { const level = heading[1].length; html += `<h${level}>${inline(heading[2])}</h${level}>`; i++; continue; }
    const image = line.match(/^!\[([^\]]+)\]\(([^)]+)\)$/);
    if (image) {
      if (!fs.existsSync(path.join(reportDir, image[2]))) throw Error(`Missing report image: ${image[2]}`);
      const mobile = /soan-danh-gia|doc-danh-gia|yeu-thich/.test(image[2]);
      html += `<figure class="${mobile ? 'mobile' : 'wide'}"><img src="${escape(image[2])}" alt="${escape(image[1])}"/><figcaption>${inline(image[1])}</figcaption></figure>`; i++; continue;
    }
    if (line.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()));
      const [headers, , ...records] = rows;
      const tableClass = ['Mã', 'STT'].includes(headers[0]) ? 'codes' : headers[0] === 'Tác nhân' ? 'actors' : '';
      html += `<table class="${tableClass}"><thead><tr>${headers.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${records.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; continue;
    }
    if (/^\d+\.\s/.test(line)) {
      html += '<ol>'; while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) html += `<li>${inline(lines[i++].trim().replace(/^\d+\.\s/, ''))}</li>`; html += '</ol>'; continue;
    }
    html += `<p${/^\[\d+\]/.test(line) ? ' class="reference"' : ''}>${inline(line)}</p>`; i++;
  }
  return html;
}
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><meta name="author" content="Lê Gia Bảo"/><title>Báo cáo tiểu luận Lê Gia Bảo</title><style>
@page{size:A4;margin:22mm 22mm 24mm 28mm}
*{box-sizing:border-box}html{background:#e5e7eb}
body{max-width:210mm;margin:20px auto;padding:22mm 22mm 24mm 28mm;background:white;color:#111;font:11.5pt/1.4 'Times New Roman',serif}
h1,h2,h3{color:black;line-height:1.25;break-after:avoid}h1{font-size:22pt}h2{font-size:17pt;margin:0 0 7mm;break-before:page}h3{font-size:13pt;margin:6mm 0 3mm}
p{margin:0 0 3.5mm;text-align:justify;orphans:3;widows:3;overflow-wrap:anywhere}p.reference{text-align:left}strong{font-weight:700}
table{width:100%;border-collapse:collapse;margin:4mm 0 6mm;font-size:10.5pt;line-height:1.25}thead{display:table-header-group}
th,td{border:1px solid #cbd5e1;padding:2.2mm 2.5mm;vertical-align:middle;text-align:left;overflow-wrap:anywhere}th{background:#eef2f6;font-weight:bold}tr{break-inside:avoid}
table.codes th:first-child,table.codes td:first-child{width:15mm;white-space:nowrap;text-align:center}table.actors td:first-child{width:26mm;white-space:nowrap}
figure{margin:5mm 0;break-inside:avoid;text-align:center}figure img{max-width:100%;max-height:125mm;object-fit:contain}figure.mobile img{width:auto;max-width:82mm;max-height:155mm}
figcaption{font-size:10.5pt;font-style:italic;line-height:1.3;margin-top:3mm}
pre{background:#f3f4f6;white-space:pre-wrap;overflow-wrap:anywhere;padding:4mm;font:10pt/1.4 Consolas,monospace;break-inside:avoid}code{font-family:Consolas,monospace;font-size:.9em;overflow-wrap:anywhere}
ol{padding-left:7mm;margin:3mm 0 5mm}li{margin-bottom:2mm}
.cover{min-height:245mm;break-after:page;text-align:center;padding-top:18mm}.cover h1{font-size:22pt;margin:0 0 17mm}.cover h2{font-size:20pt;break-before:auto;margin:0 0 7mm}.cover p{text-align:center;margin-bottom:6mm}.cover p:nth-last-child(-n+3){margin-top:8mm}.cover strong{font-weight:700}.content>h2:first-child{break-before:auto}
@media print{html{background:white}body{max-width:none;margin:0;padding:0}.cover{min-height:245mm}}
</style></head><body><section class="cover">${markdown(cover)}</section><main class="content">${markdown(body)}</main></body></html>`;
const htmlFile = path.join(reportDir, 'BAO_CAO_TIEU_LUAN.html');
fs.writeFileSync(htmlFile, html);
console.log('Report HTML generated from editable Markdown and verified UI captures.');
if (process.argv.includes('--pdf')) {
  (async () => {
    const { chromium } = require('../frontend/node_modules/@playwright/test');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
      if (broken.length) throw Error(`Report images failed to load: ${broken.length}`);
      const output = path.join(root, 'output/pdf/BAO_CAO_TIEU_LUAN_LE_GIA_BAO.pdf');
      fs.mkdirSync(path.dirname(output), { recursive: true });
      await page.pdf({ path: output, tagged: true, outline: true, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font:9px Arial,sans-serif;color:#64748b;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
      console.log('PDF generated in output/pdf. Render and inspect the PDF before delivery.');
    } finally { await browser.close(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
