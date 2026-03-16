const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testSync() {
  console.log('--- Iniciando Teste de Sincronização Amazon (Apenas Dados Reais) ---');
  
  try {
    const response = await axios.post('http://localhost:3000/api/amazon/sync', {
      config: { amazonId: 'andercleipino-20' }
    });
    
    console.log('Status da Resposta:', response.status);
    console.log('Mensagem:', response.data.message);
    console.log('Quantidade de Produtos:', response.data.count);
    
    // Ler o arquivo gerado para verificar categorias
    const filePath = path.join(process.cwd(), 'data', 'hot_products.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const counts = {};
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          counts[key] = data[key].length;
        }
      });
      
      console.log('\nResumo de Categorias em hot_products.json:');
      console.table(counts);
      
      // Verificar se algum produto tem listType
      const allProducts = Object.values(data).flat().filter(p => p && typeof p === 'object' && p.title);
      const withListType = allProducts.filter(p => p.listType !== undefined);
      
      console.log(`\nProdutos Totais: ${allProducts.length}`);
      console.log(`Produtos com listType (Categoria Especial): ${withListType.length}`);
      
      const sample = withListType.slice(0, 5);
      if (sample.length > 0) {
        console.log('\nAmostra de Categoria Especiais:');
        sample.forEach(p => {
          console.log(`- [${p.listType}] ${p.title.slice(0, 50)}...`);
        });
      }
    }
  } catch (error) {
    if (axios.isAxiosError && axios.isAxiosError(error)) {
      console.error('Erro na requisição:', error.response?.data || error.message);
    } else {
      console.error('Erro inesperado:', error.message || error);
    }
  }
}

testSync();
