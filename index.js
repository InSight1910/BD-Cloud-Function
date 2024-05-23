const { http } = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage')
const axios = require('axios');
const fs = require('fs');
const rateLimit = require('axios-rate-limit')
const path = require('path')
const https = require('https')

const axiosLimit = rateLimit(axios.create({
  timeout: 999999,
  // httpsAgent: new https.Agent({ keepAlive: true }),
}), { maxRequests: 10, perMilliseconds: 1000 })

const storage = new Storage({
  keyFilename: './charming-autumn-329804.json',
  projectId: 'charming-autumn-329804',
});


const obtenerFechaActual = () => {
  const fechaActual = new Date();

  // Obtener el mes actual (0 es enero, 11 es diciembre) y añadir 1 para que esté en rango 1-12
  let mes = fechaActual.getMonth() + 1;

  // Obtener el día del mes actual
  let dia = fechaActual.getDate();

  // Formatear para que tengan dos dígitos
  mes = mes < 10 ? '0' + mes : mes;
  dia = dia < 10 ? '0' + dia : dia;

  return { mes, dia };
};

const { mes, dia } = obtenerFechaActual();

async function uploadFileToGCS(filePath, destination) {

  const file = path.join('diario', mes.toString(), dia.toString(), destination)
  console.log(file)
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
  response.data.forEach(element => {
    axiosLimit.get('https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=' + element).then(async e => {
      await fs.writeFileSync(path.join('/tmp', element + '.json'), JSON.stringify(e.data, null, 2), (err) => {
        if (err) {
          console.error('Error guardando los datos del recorrido ' + element + ' en el archivo JSON:', err);
        } else {
          console.log('Datos guardados en ' + element + '.json');
        }

      });
      await uploadFileToGCS(path.join('/tmp', element + '.json'), element + '.json')
      await fs.rmSync(path.join('/tmp', element + '.json'))
    });
  });

  res.send('ok')
});