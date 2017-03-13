var jiragram = {

	init: function(){

		jQuery('#start-form [type="submit"]').on('click', this.onSubmit.bind(this));

		jQuery(document).on('dblclick', 'circle', this.openIssue.bind(this));

	},

	onSubmit: function(e){

		e.preventDefault();

		var inputs = jQuery('#start-form input[id]'), formData = {}, val;

		inputs.each(jQuery.proxy(function(i, el){

			el = jQuery(el);

			val = el.val();

			if(val !== '') {

				formData[el.attr('id')] = val;

			}

		}, this));

		this.sendRequest(formData);

	},

	openIssue: function(e){

		e.preventDefault();

		var link = jQuery(e.currentTarget).attr('rel');

		if(link) {

			window.open(link, '_blank');

		}

	},

	sendRequest: function(data){

		jQuery('#loading').removeClass('hide');

		jQuery.ajax({

			url: 'api.php?' + jQuery.param(this.prepareRequest(data)),

			success: jQuery.proxy(function(resp){

				this.resetDOM();

				this.parseResponse(resp, data);

			}, this)

		});

	},

	resetDOM: function(){

		jQuery('#loading').addClass('hide');

		if(!this.session){

			jQuery('#error, .login-field').addClass('hide');

		}

	},

	parseResponse: function(resp, data){

		if(resp.indexOf('cURL Error') !== -1 || resp.indexOf('301 Moved Permanently') !== -1){

			jQuery('#error').text('Request error. Check URL').removeClass('hide');

		} else if(resp.indexOf('Unauthorized (401)') !== -1){

			jQuery('#error').text('Login failed. Check credentials').removeClass('hide');

			jQuery('.login-field').removeClass('hide');

		} else if(resp === '[]'){

			jQuery('#error').text('Project is private. Log in').removeClass('hide');

			jQuery('.login-field').removeClass('hide');

		} else {

			this.onRequestSuccess(resp, data);

		}

	},

	onRequestSuccess: function(resp, data){

		resp = JSON.parse(resp);

		if(!this.session){

			this.session = data;

			this.renderOptions(resp);

			jQuery('#start-form').addClass('hide');

		} else {

			this.renderDiagram(resp);

			this.renderLegend();

		}

	},

	prepareRequest: function(data){

		data = jQuery.extend(true, {}, this.session || data);

		if(!this.session){ // initial load - load projects list

			data.ju += '/rest/api/2/project';

		} else {  // additional load - load tickets of project

			var queryString = '';

			jQuery('select').each(function(i, el){

				el = jQuery(el);

				el.find('option[value="false"]').remove();

				queryString += (el.attr('id') + '=' + el.val() + '&');
			});

			data.ju += '/rest/api/2/search?jql=' + encodeURIComponent(queryString.substr(0, queryString.length - 1));

		}

		return data;

	},

	renderOptions: function(projects){

		var controls = jQuery('#controls').removeClass('hide'), projectsHTML = '';

		for(var i = 0; i < projects.length; i++){

			projectsHTML += '<option value="' + projects[i].key + '">(' + projects[i].key + ') ' + projects[i].name + '</option>'

		}

		jQuery('#project').append(projectsHTML);

		controls.find('select').on('change', this.sendRequest.bind(this));

	},

	renderDiagram: function(data){

		d3.select('svg').remove();

		data = this.prepareData(data);

		var width = jQuery('body').width(),
			height = jQuery('body').height();

		var force = d3.layout.force()
			.nodes(d3.values(data.nodes))
			.links(data.links)
			.size([width, height])
			.linkDistance(50)
			.charge(-100)
			.on('tick', tick)
			.start();

		var svg = d3.select('body').append('svg')
			.attr('width', width)
			.attr('height', height);

		this.renderPatterns(svg, data.nodes);

		this.categories = {};

		var line = this.renderLine(svg, force),
			node = this.renderNode(svg, force),
			text = this.renderText(svg, force);

		function tick() {
			line.attr('d', function(d){
				var dx = d.target.x - d.source.x,
					dy = d.target.y - d.source.y,
					dr = Math.sqrt(dx * dx + dy * dy);
				return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
			});
			node.attr('transform', function(d){return 'translate(' + d.x + ',' + d.y + ')'});
			text.attr('transform', function(d){return 'translate(' + d.x + ',' + d.y + ')'});
		}

	},

	prepareData: function(data){

		var links = [],
			nodes = {},
			issue;

		for(var i = 0; i < data.issues.length; i++){

			issue = data.issues[i];

			links.push({
				source: issue.key,
				target: issue.fields.assignee ? issue.fields.assignee.key : issue.key,
				type: issue.fields.status.name
			});

		}

		links.forEach(function(link) {

			link.source = nodes[link.source] || (nodes[link.source] = {name: link.source, type: link.type});
			link.target = nodes[link.target] || (nodes[link.target] = {name: link.target, type: 'target'});

		});

		return {links: links, nodes: nodes};

	},

	renderPatterns: function(svg, nodes){

		var defs = svg.append("defs");

		for(var key in nodes){

			if(nodes[key].type === 'target'){

				defs.append('pattern')
					.attr('id', nodes[key].name)
					.attr('patternUnits', 'objectBoundingBox')
					.attr('width', 48)
					.attr('height', 48)
					.append('image')
					.attr('xlink:href', this.session.ju + '/secure/useravatar?&ownerId=' + nodes[key].name)
					.attr('width', 48)
					.attr('height', 48);

			}

		}

	},

	renderLine: function(svg, force){

		return svg.append('g').selectAll('path')
			.data(force.links())
			.enter().append('path')
			.attr('class', jQuery.proxy(function(d) {return 'link ' + (d.source.name === d.target.name ? 'none' : this.categoriseType(d.type)); }, this))
			.attr('marker-end', function(d) { return 'url(#' + d.type + ')'; });

	},

	renderNode: function(svg, force){

		return svg.append('g').selectAll('circle')
			.data(force.nodes())
			.enter().append('circle')
			.attr('r', function(d) { return d.type === 'target' ? 24 : 8 })
			.attr('class', jQuery.proxy(function(d) {return d.type === 'target' ? '' : this.categoriseType(d.type)}, this))
			.attr('rel', jQuery.proxy(function(d) { return this.session.ju + (d.type === 'target' ? '/secure/ViewProfile.jspa?name=' : '/browse/') + d.name; }, this))
			.attr('fill', function(d) { return d.type === 'target' ? 'url(#' + d.name + ')' : '#ccc'; })
			.call(force.drag);

	},

	renderText: function(svg, force){

		return svg.append('g').selectAll('text')
			.data(force.nodes())
			.enter().append('text')
			.attr('x', 10)
			.attr('y', '.31em')
			.text(function(d) { return d.type === 'target' ? '' : d.name; });

	},

	categoriseType: function(type){

		if(!this.categories[type]){
			this.categories[type] = 'type' + (Object.keys(this.categories).length + 1);
		}

		return this.categories[type];

	},

	renderLegend: function(){

		var html = '';

		for(var key in this.categories){

			html += '<li class="' + this.categories[key] + '">' + key + '</li>';

		}

		jQuery('#legend').html(html);

	}

};

jiragram.init();

