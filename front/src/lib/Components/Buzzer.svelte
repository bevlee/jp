<script>
    import buttonImage from "../../assets/button.png";
    
    const { question, username, socket} = $props();
    let audio
    const buzz = () => {
        audio.play()
    console.log("buzzerPressed", username)
        socket.emit("buzzerPressed");
    }
    let showToast = $state(false);
    let toastMessage = $state("");
    let answeringPlayer = $state("");
    let active = $state(true);

    socket.on("buzzerPressed", (buzzerWinner) => {
        active = false;
        answeringPlayer = buzzerWinner;
    });
    //display toast to user and bring back buzzer
    socket.on("wrongAnswer", (message) => {
        displayToast(`The guess: ${message} was incorrect!`);
        active = true;
    });

    const displayToast = async (msg) => {

        showToast = true;
        await setTimeout(function(){ showToast=false }, 3000);
        toastMessage = msg;
    }


</script>


{#if !active}
    <div> {answeringPlayer} is writing their answer</div>
{:else}
    <div>{question}</div>
    <audio src="https://cdn.freesound.org/previews/560/560189_6086693-lq.mp3" bind:this={audio}></audio>
   
    <img onclick={buzz} class="buzzer" src={buttonImage}>
{/if}
<button class="big" onclick={() => displayToast("lmao xd")}></button>

<div id="snackbar" class={showToast ? "show" : ""} visible={showToast}> {toastMessage}</div>
<style>
    .big {
        height: 50px;
        width: 50px;
    }
    .buzzer {
        max-width: 100%;
        height: auto;
    }

     /* The snackbar - position it at the top and in the middle of the screen */
#snackbar {
  visibility: hidden; /* Hidden by default. Visible on click */
  min-width: 250px; /* Set a default minimum width */
  margin-left: -125px; /* Divide value of min-width by 2 */
  background-color: #333; /* Black background color */
  color: #fff; /* White text color */
  text-align: center; /* Centered text */
  border-radius: 2px; /* Rounded borders */
  padding: 16px; /* Padding */
  position: fixed; /* Sit on top of the screen */
  z-index: 1; /* Add a z-index if needed */
  left: 50%; /* Center the snackbar */
  top: 30px; /* 30px from the top */
}

/* Show the snackbar when clicking on a button (class added with JavaScript) */
#snackbar.show {
  visibility: visible; /* Show the snackbar */
  /* Add animation: Take 0.5 seconds to fade in and out the snackbar.
  However, delay the fade out process for 2.5 seconds */
  -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
  animation: fadein 0.5s, fadeout 0.5s 2.5s;
}

/* Animations to fade the snackbar in and out */
@-webkit-keyframes fadein {
  from {top: 0; opacity: 0;}
  to {top: 30px; opacity: 1;}
}

@keyframes fadein {
  from {top: 0; opacity: 0;}
  to {top: 30px; opacity: 1;}
}

@-webkit-keyframes fadeout {
  from {top: 30px; opacity: 1;}
  to {top: 0; opacity: 0;}
}

@keyframes fadeout {
  from {top: 30px; opacity: 1;}
  to {top: 0; opacity: 0;}
} 
</style>