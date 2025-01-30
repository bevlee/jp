<script>
    const { categories, activePlayer, username, submitAnswer} = $props();
    console.log("categoreis is", categories)

    const isActivePlayer = $state((activePlayer === username));

    const submit = (category, amount) => {
        //dont do anything if its not the active team playing        
        console.log("category amount is ", category, amount)

        if (!isActivePlayer) {
            return;
        }
        submitAnswer(category, amount)
    }

</script>
{#if isActivePlayer}
<div> Please select a category</div>
{:else}

<div> {activePlayer} is selecting a category...</div>
{/if}
<div class="gameArea">
    {#each Object.entries(categories) as items}
        {console.log(items[0])}
        <div class="heading">{items[0]}</div>
        {#each items[1] as item} 

            <div class="tile">
                {#if !item.guessed}
                    <button disabled={!isActivePlayer} class="tileButton" onclick={()=> submit(items[0], item.value)}>
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