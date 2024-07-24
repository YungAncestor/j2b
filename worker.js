addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  try {
    const response = await fetch(url)
    const subs = await response.json()
    
    let subResult = ''
    let validServerCount = 0
    let invalidServerCount = 0
    let convertedNode = ''

    for (let subSingle of subs) {
        for (let serverSingle of subSingle.nodes) {
            convertedNode = convert_to_server(serverSingle)
            if (convertedNode) {
              subResult = subResult + convertedNode + '\n'
              validServerCount ++
              convertedNode = ''
            } else {
              invalidServerCount ++
            }
        }
    }

    return new Response((btoa(subResult)), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'x-valid-nodes': validServerCount.toString(),
        'x-invalid-nodes': invalidServerCount.toString()
      }
    })
  } catch (err) {
    return new Response(err, { status: 500 })
  }
}

function ascii_safe(str) {
  return str.toString().replace(/[\u007F-\uFFFF]/g, function(chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
  })
}

function ascii_safe_json_encode(obj){
  return ascii_safe(JSON.stringify(obj))
}

function convert_to_ss(parsed_conf) {
  let cipher_password = `${parsed_conf.cipher}:${parsed_conf.password}`
  let server_port = `${parsed_conf.server}:${parsed_conf.port}`
  let conf = btoa(ascii_safe(`${cipher_password}@${server_port}`))
  return `${conf}#${parsed_conf.name}`
}

function convert_to_vmess(parsed_conf) {
  let parsedServerInfo = parsed_conf.address.split(";")
  let parsedServerHost = parsedServerInfo[5].split("|")
  let convHost = parsedServerInfo[0]
  for (let eachHost of parsedServerHost) {
    if (eachHost.split("server=").length === 2) {
      convHost = eachHost.split("server=")[1]
      break
    }
  }
  
  let conf = {
    v: "2",
    ps: parsed_conf.name,
    add: convHost,
    port: parsedServerInfo[1] ? parsedServerInfo[1] : parsed_conf.port,
    id: parsed_conf.uuid,
    aid: parsed_conf.alterId,
    net: parsed_conf.network,
    type: "none",
    host: parsed_conf.host,
    path: parsed_conf.network === "grpc" ? parsed_conf.servicename : parsed_conf.path,
    servicename: parsed_conf.servicename,
    tls: parsed_conf.security
  }
  return btoa(ascii_safe_json_encode(conf))
}

function convert_to_server(parsed_conf) {
  if (parsed_conf.type === "ss") {
    return `ss://${convert_to_ss(parsed_conf)}`
  } else if (parsed_conf.type === "vmess") {
    return `vmess://${convert_to_vmess(parsed_conf)}`
  } else {
    return ``
  }
}
