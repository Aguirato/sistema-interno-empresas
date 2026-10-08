// O destino real pertence à configuração privada de cada instalação.
export function supportRecipient(value=process.env.VOLTS_SUPPORT_EMAIL){
 const result=value?.trim()||'suporte@example.invalid';
 if(result.length>254||!/^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(result))throw Error('VOLTS_SUPPORT_EMAIL deve conter um único endereço de e-mail válido.');
 return result;
}
export function supportRecipientConfigured(value){return !value.toLowerCase().endsWith('.invalid');}
