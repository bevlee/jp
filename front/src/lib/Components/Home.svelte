<script>
    let playerSocket = $state({});
    const { joinRoom } = $props();
    let roomName = $state("testRoom");
    const submit = (e) => {
        e.preventDefault()
        joinRoom(roomName);
    }
</script>

<p> Please enter the room you want to join</p>
<form onsubmit={submit}>
    <input bind:value={roomName} ><button>Join</button></form>