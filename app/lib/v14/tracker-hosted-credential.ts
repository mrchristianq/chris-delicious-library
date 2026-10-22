import {createPrivateKey} from 'node:crypto';
import {TRACKER_ACCOUNT,TRACKER_ID,TRACKER_SCOPE} from './tracker-read';
export function parseHostedTrackerCredential(input:string){
  try{
    if(!input||Buffer.byteLength(input)>32768)throw new Error();
    const v=JSON.parse(input);
    if(!v||v.type!=='service_account'||v.client_email!==TRACKER_ACCOUNT||typeof v.private_key_id!=='string'||!/^[a-f0-9]{40}$/.test(v.private_key_id)||typeof v.private_key!=='string'||!v.private_key.startsWith('-----BEGIN PRIVATE KEY-----'))throw new Error();
    const key=createPrivateKey(v.private_key);
    if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048)throw new Error();
    return {config:{serviceAccount:TRACKER_ACCOUNT,trackerId:TRACKER_ID,scope:TRACKER_SCOPE,keyId:v.private_key_id},key:v.private_key as string};
  }catch{throw new Error('Invalid private tracker credential');}
}
