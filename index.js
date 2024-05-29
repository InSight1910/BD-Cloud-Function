const { http } = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage')
const axios = require('axios');
const fs = require('fs');
const path = require('path')
const https = require('https')
const rateLimit = require('axios-rate-limit')



const axiosInstance = axios.create({
  timeout: 999999,
  httpsAgent: new https.Agent({ keepAlive: false }),
})

const axiosLimit = rateLimit(axiosInstance, {
  maxRequests: 60, perMilliseconds: 1000
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
  const requests = chunkArray(response.data, 5)
  console.log("requests: ", requests.length)
  const data = [];
  try {
    const allRequest = requests.map(async (requestPack, i) => {
      const endpoints = requestPack.map(e => axiosLimit.get(`https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=${e}`));
      const responses = await Promise.all(endpoints)
      responses.forEach(responseData => data.push(responseData.data))
      console.log("data added: ", i)
    })

    await Promise.all(allRequest)
    await fs.writeFileSync(path.join('/tmp', 'compilado.json'), JSON.stringify(data))
    await uploadFileToGCS(path.join('/tmp', 'compilado.json'), "compilado.json")
    res.send('ok')
  } catch (err) {
    console.log(err)
    res.sendStatus(400)
  }
});



// await Promise.all(
//   requests.forEach(async requestPack => {
//     const endpoints = requestPack.map(e => axiosLimit.get(`https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=${e}`))
//     axios.all(endpoints).then((responses) => {
//       responses.forEach(responseData => data.push(responseData.data))
//     })
//   })
// ).then(async () => {
//   await fs.writeFileSync(path.join('/tmp', 'compilado.json'), JSON.stringify(data))
// })