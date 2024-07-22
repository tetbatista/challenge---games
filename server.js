import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs, { read, write } from 'fs';
import path from 'path';

const app = express();
const port = 3333;
const dbPath = path.resolve('database.json');

app.use(express.json());

// Função para criar o arquivo se ele não existir
const ensureDatabaseExists = () => {
    return new Promise((resolve, reject) => {
        fs.access(dbPath, fs.constants.F_OK, (err) => {
            if (err) {
                    // Se o arquivo não existir, retorna um array vazio
                    fs.writeFile(dbPath, JSON.stringify([]), (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }       
                        });
                    } else {
                            resolve()
                        }
                });
            });
};

// Função para escrever no arquivo JSON

const readDatabase = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(dbPath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (parseErr) {
                    reject(parseErr);
                }
            }
        });
    });
};

// Função para escrever no arquivo JSON

const writeDatabase = (data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(dbPath, JSON.stringify(data, null, 2), (err) => {
            if (err) reject(err); 
            else resolve();
        });
    });
};

// Atualiza o cache em memória
let gamesCache = [];
const updateCache = async () => {
    gamesCache = await readDatabase();
};

// Inicializa o cache
ensureDatabaseExists().then(() => {
    updateCache().catch(console.error);
}).catch(console.error);

// Retornar todos os jogos

app.get('/games', (req, res) => {
        res.json(gamesCache);
        console.log('/GET - listando todos os games')
});

// Retornar um jogo específico

app.get('/games/:id', async (req, res) => {
        const game = gamesCache.find(g  => g.id === req.params.id);
        if (game) {
            res.json(game);
        } else {
            res.status(400).send('Game not found');
        }
        console.log('/GET - retorna um game específico')
});

// Criar um novo jogo

app.post('/games', async (req, res) => {
        const newGame = {
            id: uuidv4(), // Gerando um UUID único para cada novo jogo
            name: `Game ${gamesCache.length + 1}`, // Nomeando  o jogo como "Game {n}"
            liked: false, // Indica se o usuario gostou ou nao do jogo. Retorna booleano
                         // Inicialmente o jogo não é ''liked''
        };
        console.log('/POST crate-new-game', gamesCache)
        gamesCache.push(newGame);
        try {
            await writeDatabase(gamesCache)
            res.status(201).json(newGame);
    } catch (err) {
        res.status(500).send('Erro ao escrever no banco de dados.')
    }
});

// Atualizar um jogo específico

app.put('/games/:id', async (req, res) => {
    try {
        await updateCache();
        
        const gameIndex = gamesCache.findIndex(g => g.id === req.params.id);
            if (gameIndex !== -1) {
                // Atualiza o jogo no cache
                gamesCache[gameIndex] = {
                    ...gamesCache[gameIndex],
                    ...req.body
                };
                console.log('/PUT - alterar um game específico')
                await writeDatabase(gamesCache);
                res.json(gamesCache[gameIndex]);
                } else {
                    res.status(404).send('Game not found.')
                }
            } catch (err) {
                res.status(500).send('Erro ao atualizar o jogo.');
        }
    });

// Deletar um jogo específico

app.delete('/games/:id', async (req, res) => {
        const gameIndex = gamesCache.findIndex(g => g.id === req.params.id);
        if (gameIndex !== -1) {
            gamesCache.splice(gameIndex, 1);
            try {
                console.log('/DELETE - deletar um game específico')
                await writeDatabase(gamesCache);
                res.status(204).send('game deletado'); // Retorna sucesso sem conteúdo
        } catch (err) {
            res.status(500).send('Erro ao escrever no banco de dados.');
        }   
    }   else {
            res.status(404).send('Game not found.');    
    }
});

// Atualizar se gostou ou não do jogo

app.patch('/games/:id/liked', async (req, res) => {
        try {
            await updateCache();
            const game = gamesCache.find( g => g.id === req.params.id);
            if (game) {
                game.liked = req.body.liked;
                await writeDatabase(gamesCache);
                res.json(game);
            } else {
                res.status(404).send('Game not found.')
            }
        } catch (err) {
                res.status(500).send('Erro ao atualizar o jogo.')
        }
});

// Criação inicial do arquivo se não existir
fs.access(dbPath, fs.constants.F_OK, (err) => {
    if (err) {
        fs.writeFile(dbPath, JSON.stringify([]), (err) => {
            if (err) console.error('Erro ao criar o arquivo database.json', err)
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
})