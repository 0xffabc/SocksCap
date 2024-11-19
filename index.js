const net = require('net');

let host = '0.0.0.0';
let port = 443;

/**
  * Create socks5 server. We don't need authentification
  * Because we only need to capture packets
  * So, we omit first authentification packet and select NoAuth mode
  * At the next packet, we automatically reply with success code
  * And then pipe serverSocket to current socket, to cast every message on 
  * The desired server.
**/

net.createServer(async socket => {
  socket.once('data', data => {
    const version = data[0];
    if (version !== 5) return socket.end();

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

      serverSocket.pipe(socket);
      socket.pipe(serverSocket);
      serverSocket.on('error', () => socket.end());
      socket.on('error', () => serverSocket.end());
    });
  });
}).listen(1080);
