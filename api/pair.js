import { default as makeWASocket, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import fs from 'fs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Number required: 8801XXXXXXXXX' });
  
  let num = number.replace(/[^0-9]/g, '');
  if (!num.startsWith('88')) return res.status(400).json({ error: 'Use 88 country code' });

  const sessionId = `sess_${Date.now()}`;
  const sessionPath = `./${sessionId}`;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      connectTimeoutMs: 60000
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    let pairingCode = null;
    
    // 2s wait করে তারপর code request
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!sock.authState.creds.registered) {
      // TOM MINI BOT নামে real code
      pairingCode = await sock.requestPairingCode(num, 'TOM MINI BOT');
    } else {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      return res.status(400).json({ error: 'Number already linked. Remove from WhatsApp > Linked Devices' });
    }
    
    // 20s পর auto delete
    setTimeout(() => {
      try {
        sock.end();
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch {}
    }, 20000);
    
    return res.status(200).json({ code: pairingCode });
    
  } catch (error) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    return res.status(500).json({ error: error.message });
  }
}
