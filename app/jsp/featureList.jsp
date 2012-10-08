<div id="featureList"><u>Overlapped objects:</u><br/>
	<% for ( var i=0; i<selection.length; i++ )
	{ %>
		<div> <%= selection[i].properties.description %> <br/></div>
	<% } %>
</div>