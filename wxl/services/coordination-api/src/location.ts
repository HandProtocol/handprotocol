import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { HttpError } from './types.js'

function key(value: string | undefined): Buffer {
  if (!value) throw new HttpError(503,'Location encryption is not configured','provider_unavailable')
  const decoded=Buffer.from(value,'base64')
  if(decoded.length!==32) throw new HttpError(500,'LOCATION_ENCRYPTION_KEY must decode to 32 bytes','configuration_error')
  return decoded
}

export function encryptLocation(plaintext:string,keyValue:string|undefined):string{
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',key(keyValue),iv)
  const encrypted=Buffer.concat([cipher.update(plaintext,'utf8'),cipher.final()])
  const payload=Buffer.concat([Buffer.from([1]),iv,cipher.getAuthTag(),encrypted])
  return `\\x${payload.toString('hex')}`
}

export function decryptLocation(encoded:unknown,keyValue:string|undefined):string{
  if(typeof encoded!=='string')throw new HttpError(502,'Encrypted location payload is invalid','location_error')
  const payload=Buffer.from(encoded.startsWith('\\x')?encoded.slice(2):encoded,'hex')
  if(payload.length<30||payload[0]!==1)throw new HttpError(502,'Encrypted location payload version is invalid','location_error')
  const decipher=createDecipheriv('aes-256-gcm',key(keyValue),payload.subarray(1,13))
  decipher.setAuthTag(payload.subarray(13,29))
  return Buffer.concat([decipher.update(payload.subarray(29)),decipher.final()]).toString('utf8')
}
