<script>
    import { onDestroy } from "svelte";
    let timer = null;
    let {count, submitAnswer, timerText="Time left:" } = $props();
    $effect(() => {
        timer = setInterval(() => {
            if (count > 0) {
                timerFinished = false
                count -= 1
            } else {
                timerFinished = true;
                stopTimer()
            }
        }, 1000)})
    let timerFinished = $state(false)
    
    onDestroy(() => {
        clearInterval(timer);
    })
    const stopTimer = () => {
        clearInterval(timer)
        timer = null;
        submitAnswer()
    }


</script>


{#if timerFinished}
    {stopTimer()}
<h3>Time's UP!</h3>
{:else}
<h3>
    { timerText }
</h3>
<h3>{count.toString()}</h3>
{/if}