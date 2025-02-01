<script>
      
      const { teams } = $props();
  
      const scores = [teams[0].score, teams[1].score] 
      
      const winningTeam = scores[0] > scores[1] ? 0 : 1;

  </script>
  
  
  <div>
      <h1>Team {teams[winningTeam].name} won!!</h1>
    <h2>Team {teams[winningTeam].name} score: {teams[winningTeam].score}</h2>
    <h4>Team {teams[1-winningTeam].name} score: {teams[1-winningTeam].score}</h4>
  </div>
  
  