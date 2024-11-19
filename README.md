# SocksCap
JavaScript packet capture via socks5 proxy.

## Running

```
node index.js
```
This command will run a socks5 proxy server and expose NetworkInterface class to module exports

## Documentation

class NetworkInterface

### function on(name: any String from ("packet"), callback: fn(data: Buffer<u8>) -> Buffer<u8>) -> void

Adds a listener for incoming packets, where name is a string from list ("packet") and callback is a function that accepts uint8 buffer and returns same buffer or modified version of it

```

interface.on("packet", data => {
  console.log(data);
  data.push(0);

  return data;
})
```

### function addIntercept(func: fn(data: Buffer<u8>) -> Buffer<u8>) -> void

Adds a callback for intercepting sent packets. Accepts Buffer<u8> of that packet and returns same buffer of changed version of it
