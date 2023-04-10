const mongoose= require("mongoose");

const disciplinaSchema = new mongoose.Schema({
    nome:{
        type: String,
        required: true
    },
    professor:  {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilizador'
    },
    observacao: {
        type: String,
    },
    alunos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilizador'
    }]
});

const disciplina = mongoose.model("disciplina", disciplinaSchema);
module.exports = disciplina;
