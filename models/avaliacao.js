const mongoose= require("mongoose");

const avaliacaoSchema = new mongoose.Schema({
    
    nota: {
        type: String, 
    },

    disciplina: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'disciplina',
    },

    aluno:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'aluno',   
    },
});

const avaliacao = mongoose.model("avaliacao", avaliacaoSchema);
module.exports = avaliacao;