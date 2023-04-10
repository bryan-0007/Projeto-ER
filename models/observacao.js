const mongoose= require("mongoose");


const ObservationSchema = new mongoose.Schema({
    criador :{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador"
    },
    aluno :{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: "aluno"
    },
    informacao: String,
    filename: String,

    partilhado: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
        }]
    
});

const observacao = mongoose.model("Observaçao", ObservationSchema);
module.exports = observacao;