export function validateServerURL(raw:string):string {
  const u = new URL(raw.trim())
  if (u.username || u.password || !['http:','https:'].includes(u.protocol)) throw new Error('Use a local HTTP(S) Mediaphile server address')
  const host=u.hostname.replace(/^\[|\]$/g,'').toLowerCase()
  const ipv4=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  let allowed=false
  if(ipv4){
    const v=ipv4.slice(1).map(Number)
    allowed=v.every(x=>x<=255) && (v[0]===10 || v[0]===127 || (v[0]===192&&v[1]===168) || (v[0]===172&&v[1]>=16&&v[1]<=31) || (v[0]===169&&v[1]===254))
  } else {
    allowed=host==='localhost'||host==='::1'||host.startsWith('fe80:')||host.startsWith('fc')||host.startsWith('fd')||host.endsWith('.local')||host.endsWith('.lan')
  }
  if(!allowed) throw new Error('Mediaphile only connects to local network addresses')
  u.pathname='/';u.search='';u.hash=''
  return u.origin
}
