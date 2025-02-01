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
    <h4>Please submit your answer before the time runs out!</h4>
<div>The question is: <br/><i>{question}</i></div>

<form onsubmit={submit}>
    <input bind:value={answer} >

    <button>Submit</button>
</form>


<style>
    
</style>