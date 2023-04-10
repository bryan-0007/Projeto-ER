# Escolas Santo Antônio

## Projeto
Este projeto consiste na criação de um website que permite aos seguintes utilizadores: professores, pais, alunos, psicólogos:

- Consultar informação como observações, notas, material extra entre outros
- Inserir ficheiros ou outro tipo de informação tais como: notas, eventos, observações

Objetivo:
- Reduzir o número de queixas da escola
- Recolher informação sobre os alunos para os pais
- Recolher informação para os professores
- Permitir o acesso a informação em tempo real, fácil de disseminar para os utilizadores

## Instalação de dependências no Node js
1. Abrir o terminal (Command prompt) no diretório onde se encontra a pasta do projeto
2. Inserir o comando para forçar a instalação de dependências necessárias:
```bash
npm install —force
``` 

## Arrancar o website no Node js
1. Inserir no terminal o comando: 
```bash
nodemon server.js
```
2. Clique no link que aparece no terminal `http://localhost:3000`
3. Vá até ao website e insira o email e password de uma das quatro contas abaixo:

## Configuração das Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e preencha com as seguintes variáveis:

```javascript
SESSION_SECRET=<sua_chave_secreta_para_sessão>
```

Substitua `<sua_chave_secreta_para_sessão>` por uma chave secreta aleatória para a sessão.

### Aluno
- email: jcMen@gmail.com
- password: 123

### Professor
- email: lalalaa@hotmail.com
- password: 123

### Psicólogo
- email: helder@hotmial.com
- password: 123

### Encarregado de Educação
- email: jojo@gmail.com
- password: 123
