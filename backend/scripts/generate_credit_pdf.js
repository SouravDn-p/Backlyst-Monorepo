const fs = require('fs');
const path = require('path');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.error('pdfkit not installed. Please run: npm install pdfkit');
  process.exit(1);
}

const mdPath = path.join(__dirname, '..', 'docs', 'admin-credit-summary.md');
const outPath = path.join(__dirname, '..', 'docs', 'admin-credit-summary.pdf');

const md = fs.readFileSync(mdPath, 'utf8');
const doc = new PDFDocument({margin:50, size: 'A4'});
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const lines = md.split(/\r?\n/);

function writeLine(text, options = {}){
  const {fontSize = 11, bold = false, gap = 6} = options;
  doc.moveDown(0.5);
  if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
  doc.fontSize(fontSize).text(text, {align: 'left'});
  doc.moveDown(gap/12);
}

for (let line of lines){
  if (line.startsWith('# ')){
    writeLine(line.replace('# ', ''), {fontSize:18, bold:true, gap:8});
  } else if (line.startsWith('## ')){
    writeLine(line.replace('## ', ''), {fontSize:14, bold:true, gap:6});
  } else if (line.startsWith('- ')){
    // bullet
    doc.list([line.replace('- ', '')], {bulletIndent: 12});
  } else if (line.startsWith('```')){
    // skip fenced blocks for simplicity
    continue;
  } else if (line.trim() === ''){
    doc.moveDown(0.5);
  } else {
    writeLine(line, {fontSize:11, bold:false, gap:4});
  }
}

doc.end();
stream.on('finish', () => {
  console.log('PDF generated:', outPath);
});
