const { Client, LocalAuth, Buttons, List } = require("whatsapp-web.js");
const express = require("express");
const { body, validationResult } = require("express-validator");  // sebagai validasi suatu objek, misal number dan message.
const socketIO = require("socket.io");
const qrcode = require("qrcode"); //inisialisasi parameter qrcode utk generate qrcode nantinya.
const http = require("http");
const { phoneNumberFormatter } = require("./helper/formatter")

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Pelajarin pembuatan API menggunakan expressJS utk tahu arti "express.json" dan "express.urlencoded"
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});


// SESSION  --awal--
// Pada code dibawah ini, client akan mencari apakah ada session, jika ada maka akan diambil filenya.
const fs = require("fs");
const req = require("express/lib/request");
const res = require("express/lib/response");
const { url } = require("inspector");
const { response } = require("express");
const { resolveTxt } = require("dns");
// const SESSION_FILE_PATH = './session.json';     //path dimana session data akan disimpan.

// code dibawah, load session data jika sebelumnya sudah disimpan.
// let sessionCfg;

// if (fs.existsSync(SESSION_FILE_PATH)) {
//     sessionCfg = require(SESSION_FILE_PATH);
// }
// const client = new Client({ puppeteer: {headless: true}, session: sessionCfg});     //jika headless: false --> maka akan auto membuka browser utk scan barcode. Jika true, maka sebaliknya.
const client = new Client({
  puppeteer: { headless: true },
  authStrategy: new LocalAuth(),
});
// SESSION --akhir--


// wa_replies_from_db --awal--
// Skema membuat chat balasan/wa replies dari database
const db = require("./helper/database__replies");

// Listening message : menerima pesan
client.on("message", async (msg) => {
  const keyword = msg.body.toLowerCase(); // Merubah keyword ke huruf kecil semua.
  const replyMessage = await db.getReply(keyword);  // Cek ke database apakah ada data keywordnya.
  // const getChat = await msg.unreadCount()
  

  // Cek jika replyMessage tidak false, maka menampilkan message reply nya.
  if (replyMessage !== false) {
    msg.reply(replyMessage);
  } 

  if (msg.body == "!menu") {
    msg.reply("1. Mahasiswa \n2. Alumni");
  }

  // let button = new Buttons('Button body', [{body:'Sim'},{body:'Não'},{body:'Não enviar mais'}],'title','footer');
  // client.sendMessage(body.number, button);
  
});
// wa_replies_from_db --akhir--

// Sending buttons
// client.sendMessage(to, new Buttons('Body text/ MessageMedia instance',
// [{id: 'customId', body: 'button1'}, {body: 'button2'}, {body: 'button3'}, {body: 'button4'}],
// 'Title here, doesn\'t work with media', 'Footer here'), 
// {caption: 'if you used a MessageMedia instance, use the the caption here'});

// // Sending lists
// client.sendMessage(to, new List('Body text/ MessageMedia instance', 'List message button text',
// [{title: 'sectionTitle', rows: [{id: 'customId', title: 'ListItem2', description: 'desc'},
// {title: 'ListItem2'}]}] ))

client.initialize();


// Koneksi Socket IO
io.on("connection", function (socket) {
  //setiap client yg connect dgn socket kita akan diwakili dgn "function(socket)"
  socket.emit("message", "Connecting...");

  client.on("qr", (qr) => {
    console.log("QR RECEIVED", qr); //mendapatkan qrcode string
    // arti "url" pada callback "(err, url)" ialah url yg akan dikirimkan ke client.
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "QR Code received, scan please!");
    });
  });
  client.on("ready", () => {
    socket.emit("ready", "Whatsapp is ready!");
    socket.emit("message", "Whatsapp is ready!");

    // Mencari chat.
    client.getChats().then(async(chat) => {
      // console.log(chat[0].id._serialized);  // keluaran number(_serialized), total chat = 203

      const nameUnreadPrivateChat = [];
      for (const i_chat of chat) {
        // Mencari chat dengan pesan yang belum dibaca, private chat, & nama "Stepen Pane"
        if (i_chat.unreadCount > 0 && i_chat.isGroup == false && i_chat.name === "Stepen Pane") {
          // console.log(i_chat);
          // console.log(i_chat.name + '--' + i_chat.id._serialized);
          // await nameUnreadPrivateChat.push(i_chat.id._serialized);
          await nameUnreadPrivateChat.push(i_chat);
        };
      };
      console.log(nameUnreadPrivateChat[0].id._serialized);
      // console.log(nameUnreadPrivateChat[0]);

      const text1 = "===Selamat Datang di chatbot CAE Telkom University===";
      const text2 = "1. Mahasiswa\n 1.1 Mahasiswa 1 (ketik: 1.1)\n 1.2 Mahasiswa 2 (ketik: 1.2)\n\n 2. Alumni\n 2.1 Alumni 1 (ketik: 2.1)\n 2.2 Alumni 2 (ketik: 2.2)\n 2.3 Alumni 3 (ketik: 2.3)";
      // await client.sendMessage(nameUnreadPrivateChat[0].id._serialized, "===Selamat Datang di chatbot CAE Telkom University===\n\n1. Mahasiswa\n1.1 Mahasiswa 1 (ketik: 1.1)\n1.2 Mahasiswa 2 (ketik: 1.2)\n\n2. Alumni\n2.1 Alumni 1 (ketik: 2.1)\n2.2 Alumni 2 (ketik: 2.2)\n2.3 Alumni 3 (ketik: 2.3)");
      await client.sendMessage(nameUnreadPrivateChat[0].id._serialized, text1);
      await client.sendMessage(nameUnreadPrivateChat[0].id._serialized, text2);
    

      // client.on("message", (msg) => {
      //   sendMessage(nameUnreadPrivateChat[0].id._serialized)
      // });

      // --Fitur button belum bisa digunakan--
      // let button = new Buttons('Button body', [{body:'Sim'},{body:'Não'},{body:'Não enviar mais'}],'title','footer');
      // client.sendMessage(nameUnreadPrivateChat[0].id._serialized, button);
    });
  });

  // AUTENTIKASI --awal--
  // Pada code dibawah ini, ketika proses autentikasi scan qrcode berhasil, maka akan didapatkan session,
  // lalu session yg didapatkan setelah autentikasi berhasil, akan disimpan pada file './session.json'
  client.on("authenticated", () => {
    socket.emit("authenticated", "Whatsapp is authenticated!");
    socket.emit("message", "Whatsapp is authenticated!");
    console.log("AUTHENTICATED");
    // sessionCfg = session;
    // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
    //     if (err) {
    //         console.error(err);
    //     }
    // });
  });
  // AUTENTIKASI --akhir--
});

// Fungsi untuk mengecek apakah number tsb terdaftar pada whatsapp
const checkRegisterNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}


// Kirim Pesan/send message melalui postman
//  Mengirim pesan akan kita dapat dari "body"
app.post("/send-message", [body("number").notEmpty(), body("message").notEmpty()], async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
        return msg;
    });

    // Pengecekan jika "number & message" kosong 
    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisterNumber(number);

    // Cek jika number tidak terdaftar
    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: "The number is not registerd."
      });
    }

    // jika berhasil akan mengirim status 200
    client.sendMessage(number, message).then((response) => {
        res.status(200).json({
          status: true,
          response: response,
        });
        // apabila send message error
      }).catch((err) => {
        res.status(500).json({
          status: false,
          response: err,
        });
      });
  }
);

server.listen(8000, function () {
  console.log("App running on *:" + 8000);
});
