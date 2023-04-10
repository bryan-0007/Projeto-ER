require("dotenv").config(); // permite aramzenar variáveis de ambiente(environment) num ficheiro .env, na qual podemos carregar no servidor
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const passport = require("passport");
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require("mongoose"); // para criar uma base de dados e meter um esquema dessa bd em um objeto string
const session = require("express-session");
const flash = require("express-flash");
const bcrypt = require("bcryptjs"); // para encriptar através de hash, neste caso, na password
const methodOverride = require("method-override"); // para podermos utilizar HTTP methods como "put" ou "delete" onde o cliente não suporta, neste caso vou utilizar para apagar a rota "/logout", a propridade req.user e vai limpar a sessão login, em index.ejs ao carregar em LOGOUT
const { GridFsStorage } = require("multer-gridfs-storage");
//const {GridFsStorage} =require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const multer = require("multer");
const crypto = require("crypto");

const utilizador = require("./models/utilizador");
const aluno = require("./models/aluno");
const psicologo = require("./models/psicologo");
const professor = require("./models/professor");
const encarregado = require("./models/encarregado");
const falta = require("./models/falta");
const disciplina = require("./models/disciplina");
const evento = require("./models/evento");
const avaliacao = require("./models/avaliacao");
const observacao = require("./models/observacao");

var count = 0;
var nomeAluno = "";
const path = require("path");

const formatMessage = require("./utils/messages");
const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
} = require("./utils/users");

const conn = mongoose.createConnection(
    "mongodb+srv://admin:er05@cluster0.ze16dnx.mongodb.net/test",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

const botName = "Bot ";

app.use(express.urlencoded({ extended: false })); // basicamente igual ao body-parser
app.set("view engine", "ejs");
app.use(express.static("css"));
app.use(express.static("img"));
app.use(methodOverride("_method"));

//em principio posso retirar isto
const initializePassport = require("./passport-config");
initializePassport(
    passport,
    async (email) => {
        const userFound = await utilizador.findOne({ email });
        return userFound;
    },
    async (id) => {
        const userFound = await utilizador.findOne({ _id: id });
        return userFound;
    }
);

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET, // vai usar a a sessão secreta do .env
    resave: false, // caso queira voltar a guardar os mesmos dados
    saveUninitialized: false, // caso queira guardar dados vazios
    //useFindModify: false,
});

const { checkAuthenticated, checkNotAuthenticated } = require("./auth");

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/lista_estudantes", checkAuthenticated, async (req, res) => {
    if(req.user.tipo === "Professor"){
        let disc = await disciplina.findOne({ professor: req.user.id }).lean();
        substitute = [];
        for (const [key, value] of Object.entries(disc.alunos)) {
            //console.log("value: ", value.valueOf());
            let student = await utilizador.findById(value.valueOf()).lean();
            student.aluno_id = student._id.valueOf();
            substitute.push(student);
        }
        disc.alunos = substitute; //console.log("disc: ", disc);
        res.render("listaEstudantes", { disc: disc, t: req.user.tipo });
    }
    if(req.user.tipo === "Psicologo"){
        let alunos = await utilizador.find({ "tipo": "Aluno" }).lean();
        res.render("listaEstudantes", { alunos: alunos,t: req.user.tipo });
    }
    if(req.user.tipo === "Encarregado"){
        let user_id = mongoose.Types.ObjectId(req.user.id);
        console.log("user_id ", user_id);
        let encarreg = await encarregado.findOne({ "Name_utilizador" : user_id }).lean();
        console.log("encarreg ", encarreg);
        if(encarreg !== undefined){
            ed = []
            for (const [key, value] of Object.entries(encarreg.educandos)) {
                let educand = await utilizador.findById(value._id).lean();
                console.log("educand ", educand);
                ed.push(educand);
            }
        } else { ed = null}
        res.render("listaEstudantes", { edu: ed, t: req.user.tipo });
    }
});

app.get("/visualizarPauta", checkAuthenticated, async (req, res) => {
    const Aluno = await aluno
        .find()
        .populate({ path: "Name_utilizador" })
        .populate({
            path: "Avaliacao",
            model: "avaliacao",
            populate: { path: "disciplina" },
        });
    res.render("visualizarPauta", {
        user: req.user.tipo,
        buscarNome: Aluno,
    });
});

app.get("/visualizarMedias", checkAuthenticated, async (req, res) => {
    var Utilizador = await utilizador.findOne({ name: req.user.name });
    var lala = await encarregado
        .findOne({ Name_utilizador: Utilizador._id })
        .populate({ path: "Name_utilizador" })
        .populate({ path: "educandos", model: "utilizador" });
    var lulu = await avaliacao
        .find()
        .populate({ path: "disciplina" })
        .populate({ path: "aluno", populate: { path: "Name_utilizador" } });
    res.render("visualizarMedias", {
        user: req.user.tipo,
        educantes: lala,
        educantis: lulu,
    });
});

app.get("/associarEstudante", checkAuthenticated, async (req, res) => {
    var Utilizador = await utilizador.find({ tipo: "Aluno" }).lean(); // todos os alunos
    var lili = await encarregado
        .find()
        .populate({ path: "educandos", model: "utilizador" })
        .lean();

    res.render("associarEstudante", {
        user: req.user.tipo,
        todos: Utilizador,
        educantes: lili,
    });
});

app.post("/associarEstudante", checkAuthenticated, async (req, res) => {
    var encarr = await utilizador.findOne({ name: req.user.name });
    console.log(req.body.select);
    var Estudante = await utilizador.findOne({ name: req.body.select });
    var Query = await encarregado.findOneAndUpdate(
        { Name_utilizador: encarr._id },
        { $push: { educandos: Estudante._id } },
        { upsert: true }
    );
    res.redirect("/");
});

app.get("/avaliacao", checkAuthenticated, async (req, res) => {
    utilizador.find({}, function (err, utilizadores) {
        res.render("avaliacao", {
            user: req.user.tipo,
        });
    });
});

app.get("/visualizarPauta", checkAuthenticated, async (req, res) => {
    const Aluno = await aluno
        .find()
        .populate({ path: "Name_utilizador" })
        .populate({
            path: "Avaliacao",
            model: "avaliacao",
            populate: { path: "disciplina" },
        });
    res.render("visualizarPauta", {
        user: req.user.tipo,
        buscarNome: Aluno,
    });
});

app.get("/Disciplina", checkAuthenticated, async (req, res) => {
    if (req.user.tipo === "Professor") {
        let p = await utilizador.findById(req.user.id).lean();
        let d = await disciplina.findOne({ professor: p._id.valueOf() }).lean();
        res.render("Ficha_de_disciplina", {
            prof: p,
            disc: d,
            user: req.user.tipo,
        });
    }
});

app.get("/adicionarMatematica", checkAuthenticated, async (req, res) => {
    const Alunos = await aluno
        .find({ tipo: "Aluno" })
        .populate("Name_utilizador");
    res.render("adicionarMatematica", {
        alunos: Alunos,
    });
});

app.post("/adicionaMatematica", checkAuthenticated, async (req, res) => {
    const Disciplina = await disciplina.findOne({ nome: "Matemática" });
    const Utilizador = await utilizador.findOne({ name: req.body.Aluno });
    const Aluno = await aluno.findOne({ Name_utilizador: Utilizador._id });
    const Nota = new avaliacao({
        nota: req.body.notaDeAluno,
        disciplina: Disciplina._id,
        aluno: Aluno._id,
    });
    await Nota.save();
    await aluno.findOneAndUpdate(
        { Name_utilizador: Utilizador._id },
        { $push: { Avaliacao: Nota._id } },
        { upsert: true }
    );
    nomeAluno = req.body.Aluno;
    res.redirect("adicionarIngles");
});

app.get("/adicionarIngles", checkAuthenticated, async (req, res) => {
    const UtilizadorAlunos = await utilizador.find({ tipo: "Aluno" });
    res.render("adicionarIngles", {
        alunos: UtilizadorAlunos,
        nomeAluno: nomeAluno,
    });
});

app.post("/adicionaIngles", checkAuthenticated, async (req, res) => {
    const Disciplina = await disciplina.findOne({ nome: "Inglês" });
    const Utilizador = await utilizador.findOne({ name: req.body.Aluno });
    const Aluno = await aluno.findOne({ Name_utilizador: Utilizador._id });
    const Nota = new avaliacao({
        nota: req.body.notaDeAluno,
        disciplina: Disciplina._id,
        aluno: Aluno._id,
    });
    await Nota.save();
    await aluno.findOneAndUpdate(
        { Name_utilizador: Utilizador._id },
        { $push: { Avaliacao: Nota._id } },
        { upsert: true }
    );
    res.redirect("adicionarPortugues");
});

app.get("/adicionarPortugues", checkAuthenticated, async (req, res) => {
    const UtilizadorAlunos = await utilizador.find({ tipo: "Aluno" });
    res.render("adicionarPortugues", {
        alunos: UtilizadorAlunos,
        nomeAluno: nomeAluno,
    });
});

app.post("/adicionaPortugues", checkAuthenticated, async (req, res) => {
    const Disciplina = await disciplina.findOne({ nome: "Português" });
    const Utilizador = await utilizador.findOne({ name: req.body.Aluno });
    const Aluno = await aluno.findOne({ Name_utilizador: Utilizador._id });
    const Nota = new avaliacao({
        nota: req.body.notaDeAluno,
        disciplina: Disciplina._id,
        aluno: Aluno._id,
    });
    await Nota.save();
    await aluno.findOneAndUpdate(
        { Name_utilizador: Utilizador._id },
        { $push: { Avaliacao: Nota._id } },
        { upsert: true }
    );
    res.redirect("adicionarInformatica");
});

app.get("/adicionarInformatica", checkAuthenticated, async (req, res) => {
    const UtilizadorAlunos = await utilizador.find({ tipo: "Aluno" });
    res.render("adicionarInformatica", {
        alunos: UtilizadorAlunos,
        nomeAluno: nomeAluno,
    });
});

app.post("/adicionaInformatica", checkAuthenticated, async (req, res) => {
    const Disciplina = await disciplina.findOne({ nome: "Informática" });
    const Utilizador = await utilizador.findOne({ name: req.body.Aluno });
    const Aluno = await aluno.findOne({ Name_utilizador: Utilizador._id });
    const Nota = new avaliacao({
        nota: req.body.notaDeAluno,
        disciplina: Disciplina._id,
        aluno: Aluno._id,
    });
    await Nota.save();
    await aluno.findOneAndUpdate(
        { Name_utilizador: Utilizador._id },
        { $push: { Avaliacao: Nota._id } },
        { upsert: true }
    );
    res.redirect("avaliacao");
});

app.get("/index", checkAuthenticated, async (req, res) => {
    if (req.user.tipo == "Psicologo") {
        utilizador.find(
            { tipo: "Encarregado" },
            function (err, utilizadores_todos) {
                res.render("index", {
                    listaUtilizadores: utilizadores_todos,
                    user_logado: req.user.name,
                    user: req.user.tipo,
                    count: count,
                });
            }
        );
    }
    if (req.user.tipo == "Encarregado") {
        utilizador.find(
            { $or: [{ tipo: "Professor" }, { tipo: "Psicologo" }] },
            function (err, utilizadores_todos) {
                res.render("index", {
                    listaUtilizadores: utilizadores_todos,
                    user_logado: req.user.name,
                    user: req.user.tipo,
                    count: count,
                });
            }
        );
    }
    if (req.user.tipo == "Professor") {
        utilizador.find(
            {
                $or: [
                    { tipo: "Encarregado" },
                    { tipo: "Psicologo" },
                    { tipo: "Aluno" },
                ],
            },
            function (err, utilizadores_todos) {
                res.render("index", {
                    listaUtilizadores: utilizadores_todos,
                    user_logado: req.user.name,
                    user: req.user.tipo,
                    count: count,
                });
            }
        );
    }
    if (req.user.tipo == "Aluno") {
        utilizador.find(
            { tipo: "Professor" },
            function (err, utilizadores_todos) {
                res.render("index", {
                    listaUtilizadores: utilizadores_todos,
                    user_logado: req.user.name,
                    user: req.user.tipo,
                    count: count,
                });
            }
        );
    }
});

app.get("/lista_faltas", checkAuthenticated, async (req, res) => {
    let disc = await disciplina
        .findOne({ professor: req.user.id }, "_id")
        .lean(); // { professor: req.user.id }
    let faltas = await falta.find({ disciplina: disc._id.valueOf() }).lean();
    for (const [key, value] of Object.entries(faltas)) {
        const aluno_def = await utilizador.findById(value.aluno).lean();
        //value.aluno_id = aluno_def._id.valueOf();
        value.nome = aluno_def.nomeCompleto;
        value.year = value.date.getFullYear();
        value.month = value.date.getMonth();
        value.day = value.date.getDate();
        value.hour = value.date.getHours();
        value.min = value.date.getMinutes();
        value.sec = value.date.getSeconds();
    }
    res.render("lista_faltas", { faltas: faltas });
});

app.get("/falta", checkAuthenticated, async (req, res) => {
    let alun = await utilizador.find({ tipo: "Aluno" }).lean(); // { professor: req.user.id }
    for (const [key, value] of Object.entries(alun)) {
        value.aluno_id = value._id.valueOf();
    }
    res.render("falta", { alunos: alun });
});

app.post("/falta", checkAuthenticated, async (req, res) => {
    const student = req.body.estudante;
    console.log("student: " + student);
    const date = req.body.data;
    const time = req.body.tempo;
    const new_time = date + "T" + time + ":00.000Z";
    console.log("new_time: ", new_time);
    const disc = await disciplina.findOne({ professor: req.user.id }).lean();
    const doc = await falta.create({
        tipo: req.body.tipo,
        disciplina: disc._id,
        aluno: req.body.estudante,
        date: new_time,
        observacao: req.body.observacao,
    });
    res.redirect("lista_faltas");
});

app.get("/chat", checkAuthenticated, async (req, res) => {
    utilizador.find(
        {
            $or: [
                { tipo: "Encarregado" },
                { tipo: "Psicologo" },
                { tipo: "Aluno" },
                { tipo: "Professor" },
            ],
        },
        function (err, utilizadores_todos) {
            res.render("chat", {
                listaUtilizadores: utilizadores_todos,
                user_logado: req.user.name,
                user: req.user.tipo,
            });
        }
    );
});

app.get("/eventos", checkAuthenticated, async (req, res) => {
    utilizador.find({ tipo: "Professor" }, function (err, utilizadores) {
        res.render("evento", {
            user: req.user.tipo,
        });
    });
});

app.get("/visualizarEventos", checkAuthenticated, async (req, res) => {
    const Eventos = await evento.find({}).populate("disciplina").lean();
    for (const [key, value] of Object.entries(Eventos)) {
        value.year = value.date.getFullYear();
        value.month = value.date.getMonth();
        value.day = value.date.getDate();
        value.hour = value.date.getHours();
        value.min = value.date.getMinutes();
        value.sec = value.date.getSeconds();
    }
    res.render("visualizarEventos", {
        user: req.user.tipo,
        eventos: Eventos,
    });
});

app.get("/criarEventos", checkAuthenticated, async (req, res) => {
    disciplina.find({}, function (err, utilizadores) {
        res.render("criarEventos", {
            listaDeDisciplinas: utilizadores,
        });
    });
});

app.post("/criaEvento", checkAuthenticated, async (req, res) => {
    const Disciplina = await disciplina.findOne({ nome: req.body.Disciplina });
    const date = req.body.data;
    const time = req.body.tempo;
    const new_time = date + "T" + time + ":00.000Z";
    console.log("new_time: ", new_time);
    const Eventos = new evento({
        nome: req.body.nomeDeEvento,
        descricao: req.body.descricao,
        disciplina: Disciplina._id,
        date: new_time,
    });
    await Eventos.save();
    res.redirect("eventos");
});

app.get("/atendimento", checkAuthenticated, async (req, res) => {
    utilizador.find(
        {
            $or: [
                { tipo: "Encarregado" },
                { tipo: "Psicologo" },
                { tipo: "Aluno" },
                { tipo: "Professor" },
            ],
        },
        function (err, utilizadores_todos) {
            res.render("atendimento", {
                listaUtilizadores: utilizadores_todos,
                user_logado: req.user.name,
                user: req.user.tipo,
            });
        }
    );
});

app.get("/Disciplina", checkAuthenticated, async (req, res) => {
    // posso apagar ?
    utilizador.findById(req.user.id, function (err, prof) {
        res.render("Ficha_de_disciplina", {
            prof: prof,
        });
    });
});

app.get("/ficha_de_disciplinaPort", checkAuthenticated, async (req, res) => {
    var Disciplinas = await disciplina
        .findOne({ nome: "Português" })
        .populate("professor");
    res.render("Ficha_DisiciplinaPort", {
        user: req.user.tipo,
        nome: Disciplinas,
    });
});
app.get("/ficha_de_disciplinaIng", checkAuthenticated, async (req, res) => {
    var Disciplinas = await disciplina
        .findOne({ nome: "Inglês" })
        .populate("professor");
    res.render("Ficha_DisicplinaIng", {
        user: req.user.tipo,
        nome: Disciplinas,
    });
});

app.get("/ficha_de_disciplinaMat", checkAuthenticated, async (req, res) => {
    var Disciplinas = await disciplina
        .findOne({ nome: "Matemática" })
        .populate("professor");
    res.render("Ficha_DisciplinaMat", {
        user: req.user.tipo,
        nome: Disciplinas,
    });
});

app.get("/ficha_de_disciplinaInf", checkAuthenticated, async (req, res) => {
    var Disciplinas = await disciplina
        .findOne({ nome: "Informática" })
        .populate("professor");
    res.render("Ficha_DisciplinaInf", {
        user: req.user.tipo,
        nome: Disciplinas,
    });
});

app.get("/fichaEstudante", checkAuthenticated, async (req, res) => {
    //console.log("req.user.tipo. " + req.user.tipo);
    res.render("fichaEstudante", { t: req.user.tipo});
});

app.post("/FichaEstudante", checkAuthenticated, async (req, res) => {
    //if(req.user.tipo === "Professor") {
        let aluno_id = req.body.aluno_id;

        console.log("aluno_id ", aluno_id);

    let u = await utilizador.findById(aluno_id).lean();
    let u2 = await aluno.findOne({ "Name_utilizador" : aluno_id }).lean();
    let d = await disciplina.find({ "alunos" : aluno_id }).lean(); console.log("d: ", d);

    disciplinas = [];
    for (const [key, value] of Object.entries(d)) {
        disciplinas.push(value.nome);
    }

    let ed = await encarregado.findOne({ "educandos" : aluno_id }).lean();
    let encar;
    if( ed!== null && ed !== undefined){
        let enc = ed.Name_utilizador.valueOf()
        encar = await utilizador.findById(enc).lean();
    } else {
        encar = null;
    }
    console.log("encar: ", encar);

    res.render("fichaEstudante", { t: req.user.tipo, al_id: aluno_id, utiliz: u, alun: u2, actUser:  req.user.tipo,
        disc: disciplinas, enc : encar});
//}
});

app.get("/falta", checkAuthenticated, async (req, res) => {
    res.render("falta", {});
});

app.post("/getObservacoes", checkAuthenticated, async (req, res) => {
    if (req.user.tipo === "Professor") {
        let aluno_id = req.body.aluno_id;

        let user = await utilizador.findById({ aluno_id }).lean();
        let user_2 = await aluno.findOne({ Name_utilizador: aluno_id }).lean();

        res.render("fichaEstudante", { utiliz: user, alun: user2 });
    }
});

app.get("/lista_faltas", checkAuthenticated, async (req, res) => {
    let disc = await disciplina
        .findOne({ professor: req.user.id }, "_id")
        .lean(); // { professor: req.user.id }
    let faltas = await falta.find({ disciplina: disc._id.valueOf() }).lean();
    let array = [];
    let i = 0;
    for (const [key, value] of Object.entries(faltas)) {
        array[i] = value;
        const aluno_def = await utilizador
            .findById(value.aluno.valueOf())
            .lean();
        array[i].nome = aluno_def.nomeCompleto;
        i++;
    }
    res.render("lista_faltas", { faltas: faltas });
});

const { populate } = require("./models/utilizador");
//Configuration for Multer
let gfs, gridfsBucket;
conn.once("open", () => {
    // Add this line in the code

    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: "uploads",
    });
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("uploads");
});

const storage = new GridFsStorage({
    url: "mongodb+srv://admin:er05@cluster0.ze16dnx.mongodb.net/test",
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            try {
                const filename = file.originalname;
                const fileInfo = {
                    filename: filename,
                    bucketName: "uploads",
                };

                resolve(fileInfo);
            } catch (err) {
                return reject(err);
            }
        });
    },
});

const uploads = multer({ storage });

////// dar upload de files whith mutler

//Configuration for Multer

app.post(
    "/upload",
    checkAuthenticated,
    uploads.single("myFile"),
    async (req, res) => {
        res.redirect("/repositorio");
    }
);

app.get("/download/:filename", checkAuthenticated, async (req, res) => {
    try {
        const file = await gfs.files.findOne({ filename: req.params.filename });

        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (error) {
        console.log("erro--------------" + error);
    }
});

app.get("/repositorio", checkAuthenticated, async (req, res) => {
    await gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            file = false;
        }

        res.render("repositorio", { files_info: files, user: req.user.tipo });
    });
});

/////////

let gfs_obse, gridfsBucketV2;
conn.once("open", () => {
    // Add this line in the code

    gridfsBucketV2 = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: "Observacoes",
    });
    gfs_obse = Grid(conn.db, mongoose.mongo);
    gfs_obse.collection("Observacoes");
});

const Observacao = new GridFsStorage({
    url: "mongodb+srv://admin:er05@cluster0.ze16dnx.mongodb.net/test",
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            try {
                const filename = file.originalname;
                const fileInfo = {
                    filename: filename,
                    bucketName: "Observacoes",
                };

                resolve(fileInfo);
            } catch (err) {
                return reject(err);
            }
        });
    },
});

const Observacoes = multer({ storage: Observacao });

////// dar upload de files whith mutler

app.get("/download_obse/:filename", checkAuthenticated, async (req, res) => {
    try {
        console.log(req.params.filename);

        const file = await gfs_obse.files.findOne({
            filename: req.params.filename,
        });

        const readStream = gridfsBucketV2.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (error) {
        console.log("erro--------------" + error);
    }
});

app.post("/Observacao", checkAuthenticated, async (req, res) => {
    const users = await utilizador.find().lean();
    const aluno = await utilizador.findById(req.body.aluno_id).lean();
    res.render("Observacao", {
        user: req.user.tipo,
        aluno_nome: aluno.nomeCompleto,
        aluno_id: req.body.aluno_id,
        listaUtilizadores: users,
    });
});

app.post("/ListaObservacoes", checkAuthenticated, async (req, res) => {
    const userType = req.user.tipo;
    let aluno_id = req.body.aluno_id;
    let aluno = await utilizador.findById(aluno_id).lean();
    try {
        let ob = [];
        if (userType === "Professor") {
            ob = await observacao
                .find({
                    $or: [
                        { partilhado: req.user.id },
                        { criador: req.user.id },
                    ],
                    aluno: aluno_id,
                })
                .lean();
        } else if (userType === "Psicologo") {
            ob = await observacao
                .find({
                    $or: [
                        { partilhado: req.user.id },
                        { criador: req.user.id },
                    ],
                    aluno: aluno_id,
                })
                .lean();
        }

        for (const [key, value] of Object.entries(ob)) {
            //let f = await gfs_obse.files.find({filename: value.filename}).toArray(); console.log("f: ", f);
            ls = [];
            fs = [];
            let f2 = await gfs_obse.files
                .find({ filename: value.filename })
                .toArray();
            for (const [k, v] of Object.entries(value.partilhado)) {
                value.people = [];
                let person = await utilizador.findById(v.valueOf()).lean();
                ls.push(person.nomeCompleto);
            }
            for (const [ke, va] of Object.entries(f2)) {
                fs.filename = va.filename;
            }
            value.people = ls;
            value.file = fs;
        }
        //console.log("observacoes: ", ob);
        res.render("listaObservacoes", {
            user: userType,
            aluno_id: aluno_id,
            al_n: aluno.nomeCompleto,
            obs: ob,
        });
    } catch (error) {
        console.log("nao consegui abrir a pagina" + error);
    }
});

app.get("/observacao", checkAuthenticated, async (req, res) => {
    try {
        let files = await gfs_obse.files.find().toArray((err, files) => {
            //ficheiros
            if (!files || files.length === 0) {
                file = false;
            }
        });
        let utilizadores_todos = await utilizador.find({
            $or: [{ tipo: "Professor" }, { tipo: "Encarregado" }],
        }); //utilizadores
        let observaçoes = await observacao.find(); //utilizadores
        let alunos = await utilizador.find({ tipo: "Aluno" }); //aluno

        res.render("Observacao", {
            files_info: files,
            listaUtilizadores: utilizadores_todos,
            obse: observaçoes,
            alunos: alunos,
        });
    } catch (error) {
        console.log("nao consegui abrir a pagina" + error);
    }
});

app.post(
    "/Observacoe",
    checkAuthenticated,
    Observacoes.single("obser"),
    async (req, res) => {
        Observacoes.single("obser");
        let descricao = req.body.descricao;

        let partilha = req.body.partilhado;
        for (let i = 0; i < partilha.length; i++) {
            ls = mongoose.Types.ObjectId(partilha[i]);
            partilha[i] = ls;
        }
        console.log("partilhado ", partilha);

        let criador = req.user.id;
        let filename = res.req.file.filename;
        let aluno = req.body.aluno_id;
        console.log(res.req.file.filename);
        res.redirect(
            "/observacao/:" +
                descricao +
                "/:" +
                criador +
                "/:" +
                partilha +
                "/:" +
                filename +
                "/:" +
                aluno
        );
    }
);

app.get(
    "/observacao/:descricao/:criador/:partilhado/:filename/:aluno",
    checkAuthenticated,
    async (req, res) => {
        let autor = req.params.criador.replace(":", ""); // retirar os : do inicio da strings
        let descricao = req.params.descricao.replace(":", "");
        let partilhado = req.params.partilhado.replace(":", "");
        let filename = req.params.filename.replace(":", "");
        let aluno = req.params.aluno.replace(":", "");

        const myArray_partilhado = partilhado.split(","); // tranformar a string num array
        const obser = new observacao({
            //adiciona mais uma observaçao a bd
            criador: `${autor}`,
            informacao: `${descricao}`,
            filename: `${filename}`,
            aluno: `${aluno}`,
            partilhado: myArray_partilhado,
        });
        await obser.save();
        res.redirect("/lista_estudantes");
    }
);

app.post(
    "/observacaoS",
    checkAuthenticated,
    Observacoes.single("obser"),
    async (req, res) => {
        console.log("req.body ", req.body);
        let partilha = req.body.partilhado;
        for (let i = 0; i < partilha.length; i++) {
            ls = mongoose.Types.ObjectId(partilha[i]);
            partilha[i] = ls;
        }

        const obser = new observacao({
            //adiciona mais uma observaçao a bd
            criador: req.user.id,
            informacao: req.body.descricao,
            aluno: req.body.aluno_id,
            filename: "Nao tem ficheiro",
            partilhado: partilha,
        });
        await obser.save();
        res.redirect("/lista_estudantes");
    }
);

app.post("/delete-obsevation", checkAuthenticated, async (req, res) => {
    try {
        gfs_obse.files.findOneAndDelete({ filename: req.body.ficheiro });
        await observacao.findOneAndDelete({ _id: req.body.delete });
        res.redirect("/lista_estudantes");
    } catch (err) {
        console.log("Nao eliminou o ficehiro " + err);
        res.redirect("/lista_estudantes");
    }
});

app.post("/Edit", checkAuthenticated, async (req, res) => {
    try {
        const file = await gfs_obse.files.findOne({
            filename: req.body.filename,
        });
        const obser = await observacao.findById(req.body.edit);
        const nome_aluno = await utilizador.findById(obser.aluno);

        const utilizadores_todos = await utilizador.find({
            $or: [
                { tipo: "Professor" },
                { tipo: "Encarregado" },
                { tipo: "Psicologo" },
            ],
        }); //utilizadores~

        res.render("Edit_observation", {
            obser: obser,
            file: file,
            aluno: nome_aluno,
            partilhados: utilizadores_todos,
            user: req.user.tipo,
        });
    } catch (err) {
        console.log(err);
        res.redirect("/lista_estudantes");
    }
});

app.post("/obser_editada", checkAuthenticated, async (req, res) => {
    try {
        let update;

        if (req.body.check_file != undefined || req.body.check_file != null) {
            update = {
                informacao: req.body.descriaço,
                partilhado: req.body.partilhado,
            };
        } else {
            update = {
                informacao: req.body.descriaço,
                partilhado: req.body.partilhado,
                filename: "Nao tem ficehiro",
            };
        }

        console.log(update);

        const obser = await observacao.findByIdAndUpdate(
            req.body.obser_id,
            update
        );

        res.redirect("/lista_estudantes");
    } catch (err) {
        console.log("Nao editou  o ficehiro " + err);
        res.redirect("/lista_estudantes");
    }
});

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login");
});

app.get("/", checkAuthenticated, (req, res) => {
    if (req.user.tipo == "Professor") {
        res.render("home_professor");
    } else if (req.user.tipo == "Psicologo") {
        res.render("home_psicologo");
    } else if (req.user.tipo == "Encarregado") {
        res.render("home_encarregado");
    } else if (req.user.tipo == "Aluno") {
        res.render("home_aluno");
    }
});

app.post(
    "/login",
    checkNotAuthenticated,
    passport.authenticate("local", {
        successRedirect: "/", // se login for efetuado com sucesso, o user vai ser redirecionado para a rota "/"
        failureRedirect: "/login", // se login tiver algum erro, o user vai ser redirecionado para a rota "/login"
        failureFlash: true,
    })
);

app.get("/register", checkNotAuthenticated, async (req, res) => {
    res.render("register");
});

app.post("/register", checkNotAuthenticated, async (req, res) => {
    const userFound = await utilizador.findOne({ email: req.body.email }); // a userFound vai ser atribuido o email introduzido no registo
    if (userFound) {
        req.flash("error", "*User with that email already exists");
        res.redirect("/register");
    } else {
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10); // bcrypt permite a encriptação da palavra-passe, na qual vai ser encriptada dez vezes
            if (req.body.tipo == "Professor") {
                const Utilizador = new utilizador({
                    // atribuir o name, email e password no objeto User(esquema do mongodb da bd auth); que foram introduzidos no registo; nos seus correspondentes
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword,
                    tipo: req.body.tipo,
                    nomeCompleto: req.body.nomeCompleto,
                });
                await Utilizador.save(); // guardar o user na bd auth
                const utilizador2 = await utilizador.findOne({
                    name: req.body.name,
                });
                const Professor = new professor({
                    Name_utilizador: utilizador2._id,
                });
                await Professor.save();
                res.redirect("/");
            }
            if (req.body.tipo == "Aluno") {
                const Utilizador = new utilizador({
                    // atribuir o name, email e password no objeto User(esquema do mongodb da bd auth); que foram introduzidos no registo; nos seus correspondentes
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword,
                    tipo: req.body.tipo,
                    nomeCompleto: req.body.nomeCompleto,
                });
                await Utilizador.save(); // guardar o user na bd auth
                const utilizador2 = await utilizador.findOne({
                    name: req.body.name,
                });
                const Aluno = new aluno({
                    Name_utilizador: utilizador2._id,
                });
                await Aluno.save();
                res.redirect("/");
            }
            if (req.body.tipo == "Encarregado") {
                const Utilizador = new utilizador({
                    // atribuir o name, email e password no objeto User(esquema do mongodb da bd auth); que foram introduzidos no registo; nos seus correspondentes
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword,
                    tipo: req.body.tipo,
                    nomeCompleto: req.body.nomeCompleto,
                });
                await Utilizador.save(); // guardar o user na bd auth
                const utilizador2 = await utilizador.findOne({
                    name: req.body.name,
                });
                const Encarregado = new encarregado({
                    Name_utilizador: utilizador2._id,
                });
                await Encarregado.save();
                res.redirect("/");
            }
            if (req.body.tipo == "Psicologo") {
                const Utilizador = new utilizador({
                    // atribuir o name, email e password no objeto User(esquema do mongodb da bd auth); que foram introduzidos no registo; nos seus correspondentes
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword,
                    tipo: req.body.tipo,
                    nomeCompleto: req.body.nomeCompleto,
                });
                await Utilizador.save(); // guardar o user na bd auth
                const utilizador2 = await utilizador.findOne({
                    name: req.body.name,
                });
                const Psicologo = new psicologo({
                    Name_utilizador: utilizador2._id,
                });
                await Psicologo.save();
                res.redirect("/");
            }
        } catch (error) {
            console.log(error);
            res.redirect("/register");
        }
    }
});

app.delete("/logout", (req, res) => {
    req.logout(function (err) {
        //Passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
        if (err) {
            return next(err);
        }
    });
    res.redirect("/login");
});

//--------------------------------------------------Chat----------------------------
var verifica = 0;
//--------------------------------------------------Chat----------------------------

// Run when client connects
io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
        var user = {};

        if (verifica != 2) {
            user = userJoin(socket.id, username, room, count);
            verifica++;
            console.log(user);
        } else {
            count++;
            room++;
            user = userJoin(socket.id, username, room, count);
            verifica = 0;
            console.log(user);
        }

        socket.join(user.room);

        // Welcome current user
        socket.emit("message", formatMessage(botName, "Bem Vindo ao Chat!"));

        // Broadcast when a user connects
        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        // Send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
        });
    });

    // Listen for chatMessage
    socket.on("chatMessage", (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit("message", formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                "message",
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room),
            });
        }
    });
});

mongoose.set("strictQuery", true);

mongoose
    .connect("mongodb+srv://admin:er05@cluster0.ze16dnx.mongodb.net/test", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //useFindAndModify: false,
    })
    .then(() => {
        server.listen(3000, () => {
            console.log("Server is running on Port 3000 http://localhost:3000");
        });
    });
