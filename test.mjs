import fetch from 'node-fetch';
async function test() {
  const start = Date.now();
  try {
    const p = `Produto: Teclado Mecânico. Escreva um paragrafo.`;
    
    console.log("Starting qwen2.5:1.5b generation with stream: true...");
    const res = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model: 'qwen2.5:1.5b', prompt: p, stream: true })
    });
    let aiStreamedText = '';
    const reader = res.body?.getReader ? res.body.getReader() : null;
    if (reader) {
        // web stream
    } else {
        // node stream
        for await (const chunk of res.body) {
           const str = chunk.toString();
           const lines = str.split('\n').filter(Boolean);
           for (const line of lines) {
               try {
                  const d = JSON.parse(line);
                  if (d.response) aiStreamedText += d.response;
               } catch(e) {}
           }
        }
    }
    console.log("Time taken:", (Date.now() - start)/1000, "seconds");
    console.log(aiStreamedText);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
