<script>
    import buttonImage from "../../assets/button.png";
    
    const { question, username, socket} = $props();
    
        let buzzerSound
    let oofSound
    let successSound


    const buzz = () => {
        buzzerSound.play()
    
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
    <img onclick={buzz} class="buzzer" src={buttonImage}>
{/if}
<audio src="https://cdn.freesound.org/previews/560/560189_6086693-lq.mp3" bind:this={buzzerSound}></audio>
<button class="big" onclick={() => displayToast("lmao xd")}></button>

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