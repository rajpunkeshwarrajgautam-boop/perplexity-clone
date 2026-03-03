import dotenv from 'dotenv';
dotenv.config();

fetch('https://api.bytez.com/v1/models', {
  headers: { 'Authorization': `Bearer ${process.env.BYTEZ_API_KEY}` }
})
.then(r => r.json())
.then(d => {
  if (!d.data) {
    console.log(d);
    return;
  }
  const models = d.data.map(m => m.id);
  console.log(models.filter(id => id.includes('Llama') || id.includes('meta')));
});
