// api/mondialrelay.js
import { createHash } from 'crypto';
import { parseStringPromise } from 'xml2js';

export default async function handler(req, res) {
  const { cp } = req.query;

  if (!cp) {
    return res.status(400).json({ error: 'Code postal requis.' });
  }

  const enseigne = process.env.MONDIAL_ENSEIGNE;
  const privateKey = process.env.MONDIAL_PRIVATE_KEY;

  const params = {
    Enseigne: enseigne,
    Pays: 'FR',
    Ville: '',
    CP: cp,
    NombreResultats: 7,
    ModeResults: '1',
    TypeActivite: '1',
  };

  const paramString = Object.entries(params)
    .map(([key, val]) => `${key}=${val}`)
    .join('');

  const security = createHash('sha1')
    .update(paramString + privateKey)
    .digest('hex')
    .toUpperCase();

  const url =
    'https://api.mondialrelay.com/Web_Services.asmx/WSI2_RecherchePointRelais';

  const body = new URLSearchParams({ ...params, Security: security });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const xml = await response.text();
  const json = await parseStringPromise(xml, { explicitArray: false });

  const result =
    json['soap:Envelope']['soap:Body'].WSI2_RecherchePointRelaisResponse
      .WSI2_RecherchePointRelaisResult;

  if (result.STAT !== '0') {
    return res.status(500).json({ error: 'Erreur Mondial Relay', result });
  }

  const points = result.PointsRelais.PointRelais_Details;
  res.status(200).json(Array.isArray(points) ? points : [points]);
}
