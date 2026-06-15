import { default as makeWASocket, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import fs from 'fs';

export default async function handler(req, res) {
  // CORS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { number } = req.query;
  
  if (!number) {
    return res.status(400).json({ error: 'Number is required. Ex: 8801XXXXXXXXX' });
  }
  
  if (!number.startsWith('88')) {
    return res.status(400).json({ error: 'Use country code. Ex: 8801XXXXXXXXX' });
  }

  const sessionPath = `./temp_${Date.now()}`;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Pair Site', 'Chrome', '1.0.0']
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    let pairingCode = null;
    
    // Pairing code request
    if (!sock.authState.creds.registered) {
      await delay(1500);
      pairingCode = await sock.requestPairingCode(number, 'YOURBOT'); // YOURBOT এর জায়গায় তোর বটের নাম দে
    }
    
    // 20s পর connection কেটে দে + session ডিলিট
    setTimeout(async () => {
      try {
        await sock.end();
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch {}
    }, 20000);
    
    return res.status(200).json({ 
      code: pairingCode,
      message: 'Code generated. Enter in WhatsApp within 20 seconds'
    });
    
  } catch (error) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    return res.status(500).json({ error: error.message });
  }
}
