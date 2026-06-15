import { default as makeWASocket, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Number lagbe: 8801XXXXXXXXX' });
  
  let num = number.replace(/[^0-9]/g, '');
  if (!num.startsWith('88')) return res.status(400).json({ error: '88 country code দিয়া নাম্বার দে' });

  const sessionId = `sess_${Date.now()}`;
  const sessionPath = path.join('/tmp', sessionId);
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    let pairingCode = null;
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (!sock.authState.creds.registered) {
      pairingCode = await sock.requestPairingCode(num);
    } else {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      return res.status(400).json({ error: 'নাম্বার already linked. WhatsApp > Linked Devices থেকে Remove কর' });
    }
    
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
