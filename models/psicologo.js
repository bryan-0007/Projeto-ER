const mongoose= require("mongoose");


const psicologoSchema = new mongoose.Schema({
    Name_utilizador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
    },
    
});

const  psicologo = mongoose.model("psicologo", psicologoSchema);
module.exports =  psicologo;