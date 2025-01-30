<script lang="ts">
  import Home from "./lib/Components/Home.svelte";
  import Room from "./lib/Components/Room.svelte";

  
  let roomName: string = $state("");
  let roomSelected: boolean = $state(false);
  
  const joinRoom = (name: string) => {
      console.log("joining ", name)
      roomSelected = true;
      roomName = name
  }
  const leaveRoom = () => {
      console.log("leaving room ")
      roomSelected = false;
      roomName = ""
  }
// const categories = ["anime", "geography", "games", "board games", "random"];
  const categories = {
    anime: [
      {
        guessed: true, 
        value: 100,
      },
      {
        guessed: false, 
        value: 200
      },
      {
        guessed: false, 
        value: 300,
      },
    ],
    geography: [
      {
        guessed: false, 
        value: 100,
      },
      {
        guessed: false, 
        value: 200,
      },
      {
        guessed: false, 
        value: 300,
      },
    ],
    games: [
      {
        guessed: false, 
        value: 100,
      },
      {
        guessed: false, 
        value: 200,
      },
      {
        guessed: false, 
        value: 300,
      },
    ],
    "board_games": [
      {
        guessed: false, 
        value: 100,
      },
      {
        guessed: false, 
        value: 200,
      },
      {
        guessed: false, 
        value: 300,
      },
    ],
    random: [
      {
        guessed: false, 
        value: 100,
      },
      {
        guessed: false, 
        value: 200,
      },
      {
        guessed: false, 
        value: 300,
      },
    ],
  }
  </script>

<main>
  <div>
  </div>
  <div class="main">
{#if !roomSelected}
  <Home 
    {joinRoom}
    />
    {:else}
  <Room
    {roomName}
    {leaveRoom}
  />
{/if}
  </div>

</main>

