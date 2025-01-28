import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://localhost:4173",
    methods: ["GET"],
  },
});
const defaultState = () => {
  return [1,2,3,4,5].map((item) => {
    return {
      guessed: false,
      value: item*100
    }
  })
}
const categories = {
  anime: defaultState(),
  geography: defaultState(),
  gaming: defaultState(),
} 
// list of connections per room
const connections = {};
let activeGames = {};
let teams = [[],[]]

//GAME VARS

io.on("connection", async (socket) => {
  socket.removeAllListeners("startGame");

  addConnection(socket);
  const room = socket.handshake.auth.room;
  const username = socket.handshake.auth.username;
  socket.join(room);

  socket.to(room).emit("playerJoined", username);
  let rooms = io.sockets.adapter.rooms;
  console.log("the current connected clients are ", rooms);
  socket.emit("joinRoom", connections[room]);

  socket.on("changeName", (oldName, newName, room, callback) => {
    console.log("existing room connections:", connections[room]);
    console.log("changing name:", oldName, newName, callback);
    if (connections[room][newName]) {
      callback({
        status: "nameExists",
      });
    } else {
      connections[room][newName] = connections[room][oldName];
      delete connections[room][oldName];
      callback({
        status: "ok",
      });
    }

    console.log("new room connections:", connections[room]);
    io.to(room).emit("playerLeft", oldName);
    io.to(room).emit("playerJoined", newName);
  });

  socket.on("disconnect", (reason) => {
    console.log(reason + " disconnected");
    // console.log(socket.handshake.auth?.username + " username");
    removeConnection(socket);
    socket.to(room).emit("playerLeft", username);
  });

  socket.on("startGame", () => {
    console.log(
      new Date(),
      "number of scoket listerned to startgame",
      socket.listenerCount("startGame")
    );

    const time = 10;
    console.log("startGame called by socket:", socket.id);
    if (!(room in activeGames)) {
      console.log("no active game currently");
      startGameLoop(io, room, time);
    } else {
      console.log("there is an active game currently");
    }
  });

  socket.on("stopGame", (room) => {
    stopGame(socket, room);
  });

  socket.on("chooseCategory", (category) => {
    console.log("choosing category with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "chooseCategory") {
      activeGames[room]["category"] = category;
    }
  });
  socket.on("submitAnswer", (answer) => {
    console.log("submitting answer with room:", room);
    if (activeGames[room]) {
      activeGames[room]["answer"] = answer;
    }
  });
  socket.on("guessWord", (guess) => {
    console.log("guessing word with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "guessWord") {
      activeGames[room]["guess"] = guess;
    }
  });
  socket.on("buzzerPressed", () => {
    if (activeGames[room]["waitingForBuzzer"]) {
      activeGames[room]["waitingForBuzzer"] = false;
      activeGames[room]["buzzerWinner"] = username;
      console.log("buzzer pressed by ", username)
    }
  });

  if (!socket.recovered) {
    //console.log("we did not recover");
  }
});

server.listen(3001, () => {
  console.log("quiz at http://localhost:3001");
});

const getRandomSelection = (upperBound) => {
  return Math.floor(Math.random() * upperBound);
};

const startGameLoop = async (io, room) => {
  const currentPlayerRoom = room + ".active";
  const otherPlayersRoom = room + ".inactive";
  const playerCount = Object.keys(connections[room]).length;

  // assign players into two teams
  let allPlayers = Object.entries(connections[room]);

    // assign teams
  const teams = randomAssignTeams(allPlayers)
  const split = Math.floor(playerCount / 2);
  let currentPlayer = 0;
  activeGames[room]["gameState"] = categories;
  let guesses =0;
  // Loop until all categories have been elected
  while (guesses < 20) {
    io.to(room).emit("chooseCategory", activeGames[room]["gameState"], allPlayers[currentPlayer]);
    
    // wait for the guesser to choose a category'\'s
    await waitForCondition(() => {
      return (activeGames[room]["selection"] !== {});
    }, timeLimit);
    console.log("chooseCategory condition finished", activeGames[room]["selection"]);

    const category = activeGames[room]["selection"][0]
    const questionNo = activeGames[room]["selection"][1]
    const question = questions[category][questionNo];

    io.to(room).emit("buzzer", question);
  
    await waitForCondition(() => {
      return activeGames[room]["buzzerWinner"] !== "";
    }, timeLimit);
    io.to(activeGames[room]["buzzerWinner"]).emit("submitAnswer", "question");
    activeGames[room]["buzzerWinner"] = "";


    await waitForCondition(() => {
      return activeGames[room]["answer"] !== "";
    }, timeLimit);
    if (activeGames[room]["answer"] !== answers[category][questionNo]) {
      activeGames[room]["answer"] !== ""
      io.to(room).emit("buzzer", question);
    }


    guesses += 1;
  }
    const category = activeGames[room]["category"];
    //get secret word from list of words in chosen category
    console.log(activeGames[room]);
    activeGames[room]["stage"] = "writeClues";
    activeGames[room]["clues"] = [];
    const secretWord =
      secretWords[category][getRandomSelection(secretWords[category].length)];
    activeGames[room]["secretWord"] = secretWord;
    console.log(secretWord, secretWords);
    io.to(writerRoom).emit("writeClues", "writer", secretWord);
    io.to(guesserRoom).emit("writeClues", "guesser", "");

    // wait for the writers to submit clues
    await waitForCondition(() => {
      return activeGames[room]["clues"].length >= writers.length;
    }, timeLimit);

    // fill in answers if writers did not submit
    if (activeGames[room]["clues"].length < writers.length) {
      for (let i = activeGames[room]["clues"].length; i < writers.length; i++) {
        activeGames[room]["clues"].push("<no answer>");
      }
    }

    const clues = activeGames[room]["clues"];
    const machineDedupedClues = clues.slice();
    for (let i = 0; i < clues.length; i++) {
      for (let j = 0; j < clues.length; j++) {
        if (i != j) {
          if (sameWord(clues[i], clues[j])) {
            machineDedupedClues[i] = "<redacted>";
            machineDedupedClues[j] = "<redacted>";
          }
        }
      }
    }
    // array of boolean to show users which answers are likely invalid
    const clueVotes = machineDedupedClues.map((clue) =>
      clue !== "<redacted>" ? 0 : -1
    );
    activeGames[room]["votes"] = clueVotes;
    console.log("clueVotes array looks like", clueVotes);
    activeGames[room]["finishedVoting"] = false;
    io.to(writerRoom).emit("filterClues", "writer", clueVotes, clues);
    io.to(guesserRoom).emit("filterClues", "guesser");
    activeGames[room]["stage"] = "filterClues";

    // wait for the writers to submit clues
    await waitForCondition(() => {
      return activeGames[room]["finishedVoting"];
    }, timeLimit);
    let dedupedClues = clues.slice();
    // cancel out additional voted clues
    for (let i = 0; i < clues.length; i++) {
      dedupedClues[i] = clueVotes[i] >= 0 ? dedupedClues[i] : "<redacted>";
    }

    console.log(dedupedClues, clues);
    io.to(writerRoom).emit("guessWord", "writer", dedupedClues, clues);
    io.to(guesserRoom).emit("guessWord", "guesser", dedupedClues, []);
    activeGames[room]["stage"] = "guessWord";
    activeGames[room]["guess"] = "";
    // wait for the writers to submit clues
    await waitForCondition(() => {
      return activeGames[room]["guess"] !== "";
    }, timeLimit);
    const guess =
      activeGames[room]["guess"] !== ""
        ? activeGames[room]["guess"]
        : "<no guess>";
    const success = getStem(guess) === secretWord;
    activeGames[room]["success"] = success;
    activeGames[room]["dedupedClues"] = dedupedClues;
    activeGames[room]["gamesPlayed"] = ++round;
    if (success) activeGames[room]["gamesWon"] = ++winCount;

    console.log(`ending game`);
    io.to(room).emit("endGame", activeGames[room]);

    await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  
  delete activeGames[room];

};

const sameWord = (wordA, wordB) => {
  let stemmedA = getStem(wordA);
  let stemmedB = getStem(wordB);
  return stemmedA == stemmedB;
};
const getStem = (word) => {
  return word.trim().toLowerCase();
};

function waitForCondition(checkCondition, timeoutSeconds = 10) {
  const timeout = timeoutSeconds * 1000;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      console.log("checking for condition ");
      if (checkCondition()) {
        clearInterval(intervalId);
        resolve("Condition met!");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
      resolve("Timeout: Condition not met within the given time");
    }, timeout);
  });
}

const addConnection = (socket) => {
  console.log("adding connection to ", connections);
  const auth = socket.handshake.auth;
  const room = auth.room;
  if (!connections[room]) {
    connections[room] = {};
  }
  connections[room][auth.username] = {
    role: "",
    playerId: socket.id,
    // pass through the joinroom function
    joinRoom: function (roomName) {
      socket.join(roomName);
    },
    leaveRoom: function (roomName) {
      socket.leave(roomName);
    },
  };
};

const removeConnection = (socket) => {
  console.log("removing connection to ", connections);
  const auth = socket.handshake.auth;
  const username = socket.handshake.auth.username;
  const room = auth.room;

  if (connections[room]) {
    delete connections[room][username];
    if (Object.keys(connections[room]).length === 0) {
      delete connections[room]; // Clean up empty rooms
    }
  }
};
