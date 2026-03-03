const http = require('http');

const data = JSON.stringify({
  messages: [{ id: "1", role: "user", content: "What is the latest news regarding NVIDIA H100 GPUs? Search the web." }],
  focusMode: "Web",
  isProSearch: true,
  modelConfig: { modelName: "sonar", temperature: 0.4 }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
