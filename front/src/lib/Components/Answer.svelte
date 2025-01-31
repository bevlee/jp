<script>
    import Timer from "./Timer.svelte";
    
    const { question, submitAnswer} = $props();
    let answer = $state("");
    const submit = (e) => {

        e.preventDefault()
        submitAnswer(answer);
    }
</script>

<Timer count={15} submitAnswer={() => submit("")}/>
<div>{question}</div>

<form onsubmit={submit}>
    <input bind:value={answer} >

    <button>Send</button>
</form>


<style>
    
</style>