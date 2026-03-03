const https = require('https');

https.get('https://api.bytez.com/models', {
  headers: { 'Authorization': 'Bearer 5ab8d44c1671f630078cc2e32079784e' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('models count:', parsed.length || (parsed.data && parsed.data.length));
      if (Array.isArray(parsed)) {
          console.log(parsed.map(x => x.id).filter(id => id.toLowerCase().includes('llama')).slice(0, 10));
      } else if (parsed.data) {
          console.log(parsed.data.map(x => x.id).filter(id => id.toLowerCase().includes('llama')).slice(0, 10));
      } else {
          console.log(Object.keys(parsed).slice(0, 20));
      }
    } catch (e) {
      console.log('Not JSON:', data.slice(0, 500));
    }
  });
}).on('error', err => console.error(err));
