const mongoose= require("mongoose");

const eventosSchema = new mongoose.Schema({
    
    nome: {
        type: String, 
    },
    descricao: {
        type: String, 
    },
    
    disciplina: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'disciplina',
    },

    date: {
        type: Date,
        immutable:true,
        default:()=> Date.now(),
    }

});

const evento = mongoose.model("evento", eventosSchema);
module.exports = evento;