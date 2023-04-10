const mongoose= require("mongoose");


const alunoSchema = new mongoose.Schema({
    Name_utilizador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
    },
    Avaliacao:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "avaliacao",
    }],
    morada: {
        type: String,
    },
    codigoPostal: {
        type: String,
    },
    dataDeNascimento: {
        type: String,
    },
    numeroCC :{
        type: Number,
    }
});



const aluno = mongoose.model("aluno", alunoSchema);
module.exports = aluno;