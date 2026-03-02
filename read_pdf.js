const fs = require('fs');
const pdf = require('pdf-parse');

const buffer = fs.readFileSync('D:/IMPORTANT DOCUMENT/backend_guide.pdf');
pdf(buffer).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error(err);
});
