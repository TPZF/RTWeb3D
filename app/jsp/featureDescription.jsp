<div id="detailedInfo">
	<div class="thumbnail"><img src="<%= feature.properties.thumbnail %>" /></div>
	<table class="picking" rules="rows">
		<tbody>
			<tr>
				<td class="selectProperty"><em>Description:</em> </td>
				<td class="selectValue"><%= feature.properties.description %></td>
			</tr>
			<tr>
				<td class="selectProperty"><em>Id:</em></td>
				<td class="selectValue"><%= feature.properties.identifier %></td>
			</tr>
			<tr>
				<td class="selectProperty"><em>Ra:</em></td>
				<td class="selectValue"><%= feature.properties.ra %></td>
			</tr>
			<tr>
				<td class="selectProperty"><em>Dec:</em></td>
				<td class="selectValue"><%= feature.properties.dec %></td>
			</tr>
			<tr>
				<td class="selectProperty"><em>Program:</em></td>
				<td class="selectValue"><%= feature.properties.program %></td>
			</tr>
			<tr>
				<td class="selectProperty"><em>Telescope:</em></td>
				<td class="selectValue"><%= feature.properties.telescope %></td>
			</tr>
		</tbody>
	</table>
	</div>
	<div class="closeBtn"></div>
	<div id="arrow-left">
</div>