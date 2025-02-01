<script>
    import buttonImage from "../../assets/button.png";
    
    const { question, username, socket} = $props();
    
    let buzzerSound
    const buzz = () => {
        buzzerSound.play()
        socket.emit("buzzerPressed");
    }
    let answeringPlayer = $state("");
    let active = $state(true);

    socket.on("buzzerPressed", (buzzerWinner) => {
        active = false;
        answeringPlayer = buzzerWinner;
    });

    socket.on("guessResult", (message, isCorrect) => {
        active = true;
    })
</script>


{#if !active}
    <div> {answeringPlayer} is writing their answer</div>
{:else}
    <h4>{question}</h4>
    <img onclick={buzz} class="buzzer" src={buttonImage}>
{/if}
<audio src="https://cdn.freesound.org/previews/560/560189_6086693-lq.mp3" bind:this={buzzerSound}></audio>

<style>
    .big {
        height: 50px;
        width: 50px;
    }
    .buzzer {
        max-width: 100%;
        height: auto;
    }

</style>