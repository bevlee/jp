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

