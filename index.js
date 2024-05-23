const { http } = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage')
const axios = require('axios');
const fs = require('fs');
const path = require('path')
const https = require('https')

const axiosInstance = axios.create({
  timeout: 999999,
  httpsAgent: new https.Agent({ keepAlive: false }),
})

const storage = new Storage({
  keyFilename: './charming-autumn-329804.json',
  projectId: 'charming-autumn-329804',
});


const obtenerFechaActual = () => {
  const fechaActual = new Date();
  let mes = fechaActual.getMonth() + 1;
  let dia = fechaActual.getDate();
  mes = mes < 10 ? '0' + mes : mes;
  dia = dia < 10 ? '0' + dia : dia;
  return { mes, dia };
};

function chunkArray(array, chunkSize) {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    result.push(chunk);
  }
  return result;
}

async function uploadFileToGCS(filePath, destination) {
  const { mes, dia } = obtenerFechaActual();

  const file = path.join('diario', mes.toString(), dia.toString(), destination)

  await storage.bucket('eva2-vfji').upload(filePath, {
    destination: file,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  console.log(`${filePath} uploaded to eva2-duoc-vfje/${destination}`);
}

http('getAllServices', async (req, res) => {

  const response = await axios.get('https://www.red.cl/restservice_v2/rest/getservicios/all');
  const requests = chunkArray(response.data, 20)
  requests.forEach(async requestPack => {
    const requestsPack = requestPack.map(e => {
      return axiosInstance.get(`https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=${e}`)
    })
    axios.all(requestsPack).then(responses => {
      responses.forEach(async e => {
        const recorrido = e.request.path.split("codsint=")[1];
        await fs.writeFileSync(path.join('/tmp', `${recorrido}.json`), JSON.stringify(e.data, null, 2), (err) => {
          if (err) {
            console.error('Error guardando los datos del recorrido ' + recorrido + ' en el archivo JSON:', err);
          } else {
            console.log('Datos guardados en ' + recorrido + '.json');
          }

        });
        await uploadFileToGCS(path.join('/tmp', `${recorrido}.json`), recorrido + '.json')
        await fs.rmSync(path.join('/tmp', `${recorrido}.json`))
      });
    })

  })
  res.send('ok')
});