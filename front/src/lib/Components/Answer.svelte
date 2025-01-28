<script>
    
    import Timer from "./Timer.svelte";
    
    const { question, submitAnswer} = $props();
    let answer = $state("");
    const submit = (answer: string) => {
        submitAnswer(answer);
    }
</script>

<Timer count={defaultTimer} submitAnswer={() => submit("")}/>
<div>{question}</div>

<form onsubmit={submit}>
    <input bind:value={answer} >

    <button>Send</button>
</form>


<style>
    
</style>