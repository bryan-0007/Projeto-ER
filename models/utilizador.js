const mongoose= require("mongoose");


const utilizadorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    tipo:{
        type: String,
        requires: true,
    },
    nomeCompleto:{
        type:String,
        require:true,
    }
});

const utilizador = mongoose.model("utilizador", utilizadorSchema);
module.exports = utilizador;