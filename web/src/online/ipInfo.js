// What public lookup services can tell about an IPv4 address: roughly where it is, the network
// it belongs to, its host name and facts about its country. The services are asked at the same
// time and their answers merged, so one that's down or rate limited only leaves gaps. Answers
// are kept for the session.

export const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

const TIMEOUT_MS = 8000
const COUNTRY_CODE = /^[A-Z]{2}$/

const cache = new Map()

const getJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout?.(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// "+0300" and "+03:00" both become "+03:00"
const utcOffset = (text) => (typeof text === 'string' ? text.replace(/^([+-]\d\d):?(\d\d)$/, '$1:$2') : null)

const asn = (number) => (number ? `AS${String(number).replace(/^AS/i, '')}` : null)

// ipapi.co: often a finer location than the others, plus the network block and country facts
async function fromIpapi (ip) {
  const data = await getJson(`https://ipapi.co/${ip}/json/`)
  if (data.error) throw new Error(data.reason)
  return {
    location: { city: data.city, region: data.region, postal: data.postal, latitude: data.latitude, longitude: data.longitude },
    version: data.version,
    network: data.network,
    country: data.country_name,
    countryCode: data.country_code,
    countryCode3: data.country_code_iso3,
    continentCode: data.continent_code,
    inEu: data.in_eu,
    capital: data.country_capital,
    callingCode: data.country_calling_code,
    tld: data.country_tld,
    currency: data.currency,
    currencyName: data.currency_name,
    languages: data.languages ? data.languages.split(',') : null,
    population: data.country_population,
    area: data.country_area,
    timezone: data.timezone,
    utcOffset: utcOffset(data.utc_offset),
    asn: asn(data.asn),
    org: data.org
  }
}

// ipwho.is: location, the internet provider and its domain, and neighbouring countries
async function fromIpwhois (ip) {
  const data = await getJson(`https://ipwho.is/${ip}`)
  if (!data.success) throw new Error(data.message)
  return {
    location: { city: data.city, region: data.region, postal: data.postal, latitude: data.latitude, longitude: data.longitude },
    version: data.type,
    country: data.country,
    countryCode: data.country_code,
    continentCode: data.continent_code,
    inEu: data.is_eu,
    capital: data.capital,
    callingCode: data.calling_code ? `+${data.calling_code}` : null,
    borders: data.borders ? data.borders.split(',') : null,
    timezone: data.timezone?.id,
    utcOffset: utcOffset(data.timezone?.utc),
    asn: asn(data.connection?.asn),
    isp: data.connection?.isp,
    org: data.connection?.org,
    domain: data.connection?.domain
  }
}

// GeoJS: no rate limit, so it's the fallback when neither of the others answered
async function fromGeojs (ip) {
  const data = await getJson(`https://get.geojs.io/v1/ip/geo/${ip}.json`)
  if (!data.country_code) throw new Error('no answer')
  return {
    location: { city: data.city, region: data.region, latitude: Number(data.latitude), longitude: Number(data.longitude) },
    country: data.country,
    countryCode: data.country_code,
    countryCode3: data.country_code3,
    continentCode: data.continent_code,
    timezone: data.timezone,
    asn: asn(data.asn),
    org: data.organization_name
  }
}

// The host name the network gave the address (reverse DNS), through Google's DNS over HTTPS
async function fromReverseDns (ip) {
  const name = `${ip.split('.').reverse().join('.')}.in-addr.arpa`
  const data = await getJson(`https://dns.google/resolve?name=${name}&type=PTR`)
  const answer = data.Answer?.find(record => record.type === 12)
  if (!answer) throw new Error('no host name')
  return { hostname: answer.data.replace(/\.$/, '') }
}

const isSet = (value) => value !== null && value !== undefined && value !== '' && !Number.isNaN(value)

async function fetchInfo (ip) {
  // In order of preference where they disagree
  const services = [['ipapi.co', fromIpapi], ['ipwho.is', fromIpwhois], ['dns.google', fromReverseDns]]
  const settled = await Promise.allSettled(services.map(([, ask]) => ask(ip)))
  const answers = services
    .map(([name], index) => [name, settled[index].value])
    .filter(([, answer]) => answer)
  if (!answers.some(([, answer]) => answer.countryCode)) {
    try {
      answers.push(['geojs.io', await fromGeojs(ip)])
    } catch {
      // Nothing more to ask
    }
  }
  if (!answers.length) throw new Error('no service answered')

  const info = { ip, sources: answers.map(([name]) => name) }
  for (const [, { location, ...fields }] of answers) {
    for (const [field, value] of Object.entries(fields)) {
      if (!isSet(info[field]) && isSet(value)) info[field] = value
    }
  }
  // The place comes from a single service, so the city and the coordinates go together
  const place = answers.map(([, answer]) => answer.location).find(location => location && isSet(location.latitude))
  Object.assign(info, { city: null, region: null, postal: null, latitude: null, longitude: null }, place)
  if (!COUNTRY_CODE.test(info.countryCode || '')) info.countryCode = null
  return info
}

/** Everything found about an IPv4 address. A lookup that failed is tried again on the next call. */
export function lookUpIp (ip) {
  if (!cache.has(ip)) {
    const pending = fetchInfo(ip)
    cache.set(ip, pending)
    pending.catch(() => cache.delete(ip))
  }
  return cache.get(ip)
}

/** The flag emoji for a two-letter country code: a pair of regional indicator letters. */
export const flagEmoji = (code) => String.fromCodePoint(...[...code].map(letter => 0x1f1a5 + letter.charCodeAt(0)))

/** The country's flag as a PNG from flagcdn.com; widths are 20, 40, 80, 160, 320, 640, 1280 or 2560. */
export const flagPng = (code, width) => `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`
