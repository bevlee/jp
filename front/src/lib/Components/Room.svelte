<script lang="ts">
    import { io } from "socket.io-client";
    import { SvelteSet } from "svelte/reactivity";
    import Answer from "./Answer.svelte";
    import Buzzer from "./Buzzer.svelte";
    import ChooseCategory from "./ChooseCategory.svelte";
    import EndGame from "./EndGame.svelte";
///sounds

    import oofMp3 from "../../assets/oof.mp3";
    let buzzerSound
    let oofSound
    let successSound
    let winSound


    let {roomName, leaveRoom} = $props();
    console.log("Room name in child:", roomName); 
        let gameStarted = $state<boolean>(false)
        let username = $state<string>(localStorage.getItem('username'))
        let categories: object = {};
        let currentCategory: string = ""
        let timer: Number = 20;
        let answer: string = "hehexd";
        let guess: string = "";
        let teams = $state([
            {
                name: "Michelle",
                score: 0,
                members: new Set()
            },
            {
                name: "Edana",
                score: 0,
                members: new Set()
            }
        ]);
        let currentTeam = 0;
        let userTeam: string = $state("");
        let activePlayer: string = $state("");
        let currentAmount: number = $state(0);
        let currentQuestion: string = "";

        if (!username) {
            username = "user" + Math.floor(Math.random() * 10000)
            setUsername(username)
        }
        let currentScene = $state<string>("main")
        let players = $state(new SvelteSet([username]));

        function setUsername(newUsername:string) {
            localStorage.setItem('username', newUsername);
            username = newUsername;
        }
        // init socket
        const socket = io("http://localhost:3001", {
                auth: {
                    serverOffset: 0,
                    username: username,
                    room: roomName
                },
                path: "/socket2/"
            });
    
        socket.on("disconnect", () => {
            //send the username to the server
            console.log(`user ${socket.id} disconnected`);
        });
        socket.on("connect", () => {
            console.log(socket.auth);
        });

        socket.on("userUpdate", ( team:number) => {
            currentTeam = team;
        });
        socket.on("changeTeam", ( updatedTeams) => {
            console.log("updatedTeams", updatedTeams)
            teams[0].members = updatedTeams[0]
            teams[1].members = updatedTeams[1]
        });
        socket.on("joinRoom", (players: Array<string>, teamSets:Array<Set<String>>) => {
            console.log("joined room which consists of: ", players, teamSets)
            players = players;
            teams[0].members = teamSets[0]
            teams[1].members = teamSets[1]
        })

        socket.on("playerJoined", (player: string, teamSets = undefined) => {
            players.add(player)
            if (teamSets) {
                teams[0].members = teamSets[0]
                teams[1].members = teamSets[1]
            }
        })
        socket.on("playerLeft", (player: string, teamSets = undefined) => {
            console.log(`user ${player} left`);
            players.delete(player)
            if (teamSets) {
                teams[0].members = teamSets[0]
                teams[1].members = teamSets[1]
            }
        })
 
        socket.on("chooseCategory", (gameState: object,  guesser:string) => {
            console.log(`changing scene to chooseCategory with categories ${gameState} and ${guesser} choosing category`)
            
            currentScene = "chooseCategory"
            if (currentScene === "main") {
                gameStarted = false
            }
            categories = gameState
            activePlayer = guesser
        })

        socket.on("buzzer", (category: string, amount: number, question: string) => {
            console.log(`changing scene to buzzer with quetsion ${question} and amount ${amount}`)
            currentQuestion = question
            currentAmount = amount
            currentCategory = category
            currentScene = "buzzer"
        })
        socket.on("test", (testMessage) => {
            console.log(testMessage)
        })

        socket.on("guessAnswer", (question: string ) => {
            console.log(`changing scene to guessAnswer with quetsion ${question} `)
            currentScene = "guessAnswer";
            currentQuestion = question;

        })

        socket.on("scoreChange", (teamId: number, newScore: number ) => {
            teams[teamId].score = newScore;
        })
        socket.on("gameFinished", () => {
            winSound.play()
            currentScene = "gameFinished"
        })

        let showToast = $state(false);
        let toastMessage = $state("");
    let active = $state(true);
    //display toast to user and bring back buzzer
    socket.on("guessResult", (message, isCorrect) => {
        displayToast(`The guess: ${message} was ${isCorrect}!`);
        active = true;

        if (isCorrect) {
            successSound.play()
        } else {
            oofSound.play()
        }
    });

    const displayToast = async (msg) => {

        showToast = true;
        await setTimeout(function(){ showToast=false }, 3000);
        toastMessage = msg;
    }
        //////// FUNCTIONS
        const changeName = async (newName: string) => {
            const success = await new Promise(resolve=> {
                socket.emit("changeName", username, newName, roomName, (response) => {
                    if (response) {
                        resolve(response.status === 'ok')
                    }
                    resolve(false);
                })
            })
            if (success) {
                setUsername(newName)
                return true;
            } 
            return false
        }

        const changeTeam = async () => {
            socket.emit("changeTeam", username, currentTeam, roomName);
        }
        
        console.log("roomname is", roomName)
        const changeNamePrompt = async () => {
            let newName: string = prompt("Please enter your username", username)
            if (newName.length > 0 && newName.length < 30 && newName != username) {

                const nameChangeSuccess = await changeName(newName);
                if (!nameChangeSuccess) {
                    alert("Error: There is already a player in the room with the name: ");
                    // await changeNamePrompt()
                } 
            } else {
                alert("Name must be between 1 and 30 chars and unique. Try again!")
            }
        }

        // submit event to server and proceed to next scene
        const submitAnswer = (input: string) => {
            socket.emit("submitAnswer", input)
            console.log(`submitted ${input} for` ,currentScene)
        }
        const guessAnswer  = (guess: string) => {
            socket.emit("submitAnswer", guess)
        }
        
        const chooseCategory = (category: string, amount: number) => {
            //convert the amount into an index
            socket.emit("chooseCategory", category, amount/100 - 1);
        }

        const leave = () => {
            socket.disconnect()
            leaveRoom()
        }

        const startGame = async () => {
            console.log("starting the game")
            socket.emit("startGame", (response) => {
                console.log("callback was", response)
            })
            gameStarted = true
        }
    </script>
    
    <button class="bigButton" onclick={()=>leave()}>Leave room</button>
    
    <h3>Room: 
        <strong>{roomName}</strong>
    </h3>

    <h4>Username: 
        <strong>{username}</strong>
    </h4>
    
    {#if currentScene==="main" || currentScene==="endGame"}
        <button  class="bigButton" onclick={changeNamePrompt}>Change Name</button>
    {/if}

    <!-- <h4>Players in Lobby: 
        <ul>
            {#each players.keys() as player}
                <li>{player}</li>
            {/each}
        </ul>
    </h4> -->
<div class="teamContainer">
    Teams:
    {#each teams as team}
    <div  class="header">Team {team.name}: ${team.score}</div>
        {#each team.members as member}
            {#if member=== username}
            <div class="teamMember bold">{member} (me)</div>
            {:else}

            <div class="teamMember">{member}</div>
            {/if}
        {/each}

    {/each}
    <button  class="bigButton" hidden={currentScene!=="main"} onclick={changeTeam}> Change team </button>
</div>
{#if currentScene == "main"}
    <div>
        <h4>How to play: </h4>
        <div class="justify-start">
            <ol class="list-decimal list-inside inline-block">
                <li>Select a category to answer a question</li>
                <li>Press the buzzer to answer the question but you only have 10 seconds to type out your answer so don't press too early!</li>
                <li>Please spell your answer correctly or you may not win the money!</li>
                <li>Correctly answer questions to get money!</li>
            </ol>
        </div>
    </div>
    <button class="startButton" onclick={startGame}>Start</button>

{:else if currentScene === "chooseCategory"}

    <ChooseCategory {categories} {activePlayer} {username} submitAnswer={chooseCategory} />

{:else if currentScene === "buzzer"}

    <Buzzer question={currentQuestion}  {username} {socket}/>

{:else if currentScene === "guessAnswer"}
    {console.log("changing to guessAnswer")}
    <Answer question={currentQuestion} submitAnswer={guessAnswer}/>

{:else if currentScene === "gameFinished"}
    {console.log("changing to guessAnswer")}
    <EndGame teams={teams}/>

{/if}


<audio src="https://cdn.freesound.org/previews/560/560189_6086693-lq.mp3" bind:this={buzzerSound}></audio>
<audio src="https://cdn.freesound.org/previews/109/109663_945474-lq.mp3" bind:this={successSound}></audio>
<audio src="https://cdn.freesound.org/previews/269/269198_4409114-lq.mp3" bind:this={winSound}></audio>
<audio src={oofMp3} bind:this={oofSound}></audio>
<div id="snackbar" class={showToast ? "show" : ""} hidden={!showToast}> {toastMessage}</div>
<button onclick={()=>buzzerSound.play()}>buzz</button>
<button onclick={()=>successSound.play()}>success</button>
<button onclick={()=>oofSound.play()}>oof</button>
<style>
    .teamContainer {
        display: "grid";
        border: solid 1px blue;
        grid-template-columns: auto auto;
    }
    .teamMember {
        height: 20px;
        color: blueviolet;
        font-weight: 600;
    }

    .bold {

        font-weight: 800;
        font-style: italic
    }
    .bigButton {
  border-radius: 8px;
  border: 1px solid black;
  padding: 1.5vh;
  margin: 1.5vh;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.25s;
}
.header { 

    font-style: 900;
}
    
</style>