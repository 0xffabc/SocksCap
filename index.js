const net = require('net');

let host = '0.0.0.0';
let port = 443;

let hooks = [];
let packetModifiers = [];

const connectListeners = [];

/**
  * Create socks5 server. We don't need authentification
  * Because we only need to capture packets
  * So, we omit first authentification packet and select NoAuth mode
  * At the next packet, we automatically reply with success code
  * And then pipe serverSocket to current socket, to cast every message on
  * The desired server.
**/

net.createServer(async socket => {
  if (process.env.PORT) socket.on('data', console.log); /** Debug mode **/
  socket.once('data', data => {
    const thisModifiers = [];
    
    for (const listener of connectListeners) {
      const adapter = {
        addIntercept(callback) {
          thisModifiers.push(callback);
        },
        fake(packet) {
          socket.write(packet);
        }
      };

      listener(adapter);
    }
   
    const version = data[0];
    if (version !== 5) {
     socket.write(`HTTP/1.1 200 OK
Connection: Keep-Alive
Content-Type: text/html; charset=utf-8
Content-Length: 1

a`);
     return socket.end();
    }

    const nMethods = data[1];
    const methods = data.slice(2, 2 + nMethods);
    socket.write(Buffer.from([5, 0]));

    socket.once('data', data => {
      const cmd = data[1];
      const destAddrType = data[3];

      if (destAddrType === 1) {
        host = data.slice(4, 8).join('.');
        port = data.readUInt16BE(8);
      } else if (destAddrType === 3) {
        const addrLen = data[4];
        host = data.slice(5, 5 + addrLen).toString();
        port = data.readUInt16BE(5 + addrLen);
      } else {
        return socket.end();
      }

      const serverSocket = net.createConnection({ host, port }, () => {
        socket.write(Buffer.from([5, 0, 0, destAddrType, 0, 0, 0, 0, 0, 0]));
      });

      serverSocket.on('data', async data => {
        packetModifiers.forEach(hook => data = hook(data));
       
        for (const hook of thisModifiers) {
          const resp = await hook(data, "tcp");
          data = resp.data;

          console.log(`[GlobalInterface] Modified ${data.toString().slice(0, 20)}`);
        }
       
        socket.write(data);
      });

      socket.on('data', data => {
        hooks.forEach(hook => data = hook(data));
        serverSocket.write(data);
      });

      serverSocket.on('error', () => socket.end());
      socket.on('error', () => serverSocket.end());
    });
  });
}).listen(process.env.PORT || 1080);

/**
  * @name NetworkInterface
  * @description Abstract layer over socks5 proxy
  * Provides better control over hooks
**/

class NetworkInterface {

  addIntercept(func) {
    hooks.push(func);
  }

  on(name, callback) {
    if (name == 'connect') return connectListeners.push(callback);
    if (name != 'packet') return;

    packetModifiers.push(callback);
  }
}


module.exports = NetworkInterface;
