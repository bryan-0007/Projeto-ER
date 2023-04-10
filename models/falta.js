const mongoose= require("mongoose");

const faltaSchema = new mongoose.Schema({
    tipo: {type: String, enum: ["presença", "material"]},
    disciplina: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'disciplina'
    },
    observacao: {
        type: String,
    },
    aluno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilizador'
    },
    date: {
        type: Date,
        immutable:true,
        default:()=> Date.now(),
    }
});

const falta = mongoose.model("falta", faltaSchema);
module.exports = falta;