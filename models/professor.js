const mongoose= require("mongoose");


const professorSchema = new mongoose.Schema({
    Name_utilizador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "utilizador",
    },
    
});

const  professor = mongoose.model("professor", professorSchema);
module.exports =  professor;