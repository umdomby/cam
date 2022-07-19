const app = require("express")();
//const servertest = require("http").createServer(app);
const cors = require("cors");

const fs = require('fs');

var https = require('https');
var options = {
  key: fs.readFileSync('./cert/servicerobotpro/privkey.pem'),
  cert: fs.readFileSync('./cert/servicerobotpro/cert.pem')
};
var servertest = https.createServer(options, app);

// const privateKey = fs.readFileSync(path.resolve(__dirname,'./cert/servicerobotpro/privkey.pem'));
// const certificate = fs.readFileSync(path.resolve(__dirname,'./cert/servicerobotpro/cert.pem'));
// const ca = fs.readFileSync(path.resolve(__dirname,'./cert/servicerobotpro/chain.pem'));

const io = require("socket.io")(servertest, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const PORT = process.env.PORT || 443;

app.get("/", (req, res) => {
  res.send("Running");
});


io.sockets.on('connection', socket => {
  let room = '';
  // sending to all clients in the room (channel) except sender
  socket.on('message', message => socket.broadcast.to(room).emit('message', message));
  socket.on('find', () => {
    const url = socket.request.headers.referer.split('/');
    room = url[url.length - 1];
    const sr = io.sockets.adapter.rooms[room];
    if (sr === undefined) {
      // no room with such name is found so create it
      socket.join(room);
      socket.emit('create');
    } else if (sr.length === 1) {
      socket.emit('join');
    } else { // max two clients
      socket.emit('full', room);
    }
  });
  socket.on('auth', data => {
    data.sid = socket.id;
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('approve', data);
  });
  socket.on('accept', id => {
    io.sockets.connected[id].join(room);
    // sending to all clients in 'game' room(channel), include sender
    io.in(room).emit('bridge');
  });
  socket.on('reject', () => socket.emit('full'));
  socket.on('leave', () => {
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('hangup');
    socket.leave(room);});
});

servertest.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
