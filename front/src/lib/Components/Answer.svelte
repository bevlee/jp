<script>
    import Timer from "./Timer.svelte";
    
    const { question, submitAnswer} = $props();
    console.log(question)
    let answer = $state("");
    const submit = (e) => {

        e.preventDefault()
        submitAnswer(answer);
    }
</script>

<Timer count={15} submitAnswer={() => submit("")}/>
    <h4>Please submit your answer before the time runs out!</h4>
<h2>The question is: <br/><i>{question}</i></h2>

<form onsubmit={submit}>
    <input bind:value={answer} >

    <button>Submit</button>
</form>


<style>
    
</style>