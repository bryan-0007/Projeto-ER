const mongoose= require("mongoose");


const encarregadoSchema = new mongoose.Schema({
    Name_utilizador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
    },

    educandos: [{ 
        type:mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
    }],

});

const  encarregado = mongoose.model("encarregado", encarregadoSchema);
module.exports =  encarregado;