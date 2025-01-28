<script>
    const { categories, teamName, guessingTeam, submitAnswer} = $props();
    console.log("categoreis is", categories)

    const isGuessing = (teamName === guessingTeam);

    const submit = (category, amount) => {
        //dont do anything if its not the active team playing
        if (!isGuessing) {
            return;
        }
        submitAnswer(category, amount)
    }

</script>

<div class="gameArea">
    {#each Object.entries(categories) as items}
        {console.log(items[0])}
        <div class="heading">{items[0]}</div>
        {#each items[1] as item} 

            <div class="tile">
                {#if !item.guessed}
                    <button disabled={isGuessing} class="tileButton" onclick={()=> submit(items[0], item.value)}>
                        <span style={"font-size: 30px"}>${item.value}</span>
                    </button> 
                {/if}
            </div>
        {/each}
    {/each}
</div>

<style>
    .gameArea {
        display: grid;
        border: solid 1px blue;
        grid-template-columns: auto auto auto auto;
        
    }
    .tile {
        border: solid 1px black;
        height: 100px;
        width: 100px;
    }
    .heading {
        border: solid 1px black;
        height: 100px;
        width: 100px;     
        font-size: medium;   
        font-style: italic;
        
    }
    .tileButton {
        height: 100%;
        width: 100%;
    }
</style>