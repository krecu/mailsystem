jQuery(document).ready(function ($) {

	/**
	 * набор цветовой палитры
	 * blue - цвет сектора
	 * yellow - цвет закраски линии обьема операции "Приобретение"
	 * green - цвет закраски линии обьема операции "Санация"
	 * @param color
	 * @returns {*}
	 */
	var defineColor = function(color) {
		switch (color) {
			//case "green" :  return "rgb(125, 176, 67)";
			case "green" :  return "rgb(223, 0, 62)";
			//case "yellow" : return "rgb(230, 137, 0)";
			case "yellow" : return "rgb(254, 163, 32)";
			//case "blue" :   return "rgb(0, 170, 191)";
			case "blue" :   return "rgb(39, 196, 209)";
		}
	}

	function infoBankGraphic(options) {
		/** задаем рамеры инфографика */
		var width = 600,
			height = 600,
			outerRadius = Math.min(width, height) / 2 - 10,
			innerRadius = outerRadius - 24;

		var activeEl = null;
		var activeElType = null;
		var colors = [];
		colors[0] = "green";
		colors[1] = "yellow";
		colors[-1] = "blue";

		var tooltip = $("#tooltip");
		var description = $("#description");

		/** инициализируем окружность */
		var arc = d3.svg.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius);

		/** задаем базовые настройки секторов */
		var layout = d3.layout.chord()
			.padding(.01)
			.sortSubgroups(d3.descending)
			.sortChords(d3.ascending);

		/** инициализируем базовый сектор */
		var path = d3.svg.chord()
			.radius(innerRadius);

		/** инициализируем сам график */
		var svg = d3.select("#graph").append("svg")
			.attr("width", width)
			.attr("height", height)
			.append("g")
			.attr("id", "circle")
			.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


		/**
		 * Находим максимальное значение по сумме операций всех банков
		 * @param matrix
		 * @returns int
		 */
		function getMaxOpByType(matrix, type) {
			var max = 0;
			for (var i in matrix) {
				if (max < matrix[i].summ && matrix[i].type == type) {
					max = matrix[i].summ;
				}
			}
			return max;
		}

		/**
		 * Находим максимальное значение в строке матрици
		 * @param matrix
		 * @returns int
		 */
		function getMaxBankByType(matrix, type) {
			var max = 0;
			for (var i in matrix) {
				if (max < matrix[i].value && matrix[i].type == type) {
					max = matrix[i].value;
				}
			}
			return max;
		}

		/**
		 * Определяем степень прозрачности по операциям в банке
		 * @param item
		 * @param data
		 * @returns float
		 */
		function getBankColorOpacity(item, data) {
			var banks = data.all.list;
			var bank = banks[item.index];
			var color = (0.8 * (bank.value * 100 / getMaxBankByType(banks, bank.type)) / 100).toFixed(2);
			return (color <= 0.3) ? 0.5 : color;
		}

		/**
		 * Задаем фоновый цвет по умолчанию для банка
		 * @param item
		 * @param data
		 * @returns {*}
		 */
		function getBankColor(item, data) {
			var banks = data.all.list;
			var bank = banks[item.index];
			var color = "";
			switch (bank.type) {
				case 'parent' :
					color = "blue";
					break;
				case 's' :
					color = "green";
					break;
				case 'a' :
					color = "yellow";
					break;
			}
			return defineColor(color)
		}

		/**
		 * Вычисляем цвет операции по имени банка
		 * @param item
		 * @param data
		 * @returns {*}
		 */
		function getShortColorOpacity(item, data) {
			var banks = data.all.list;
			var bank = banks[item.target.index];
			var color = (0.8 * (bank.value * 100 / getMaxBankByType(banks, bank.type)) / 100).toFixed(2);
			return (color <= 0.3) ? 0.5 : color;
			//var operations = data.all.op;
			//var smax = getMaxOpByType(operations, 1);
			//var amax = getMaxOpByType(operations, 0);
			//for (id in operations) {
			//	if (id == item.source.index + ":" + item.source.subindex) {
			//		console.log(item);
			//		if (operations[id].type == 1) {
			//			var color = (0.8 * (item.target.value * 100 / smax) / 100).toFixed(2);
			//		} else if (operations[id].type == 0) {
			//			var color = (0.8 * (item.target.value * 100 / amax) / 100).toFixed(2);
			//		}
			//	}
			//}
			//return (color <= 0.3) ? 0.5 : color;
		}

		/**
		 * Определяем цвет сектора по операциям
		 * @param item
		 * @param data
		 * @returns {*}
		 */
		function getShortColor(item, data) {
			var operations = data.all.op;
			for (var id in operations) {
				if (id == item.source.index + ":" + item.source.subindex) {
					if (operations[id].type == 1) {
						return defineColor("yellow");
					} else if (operations[id].type == 0) {
						return defineColor("green");
					}
				}
			}

			return 0;
		}

		function formatMoney(n, c, d, t){
			var n = n,
				c = isNaN(c = Math.abs(c)) ? 2 : c,
				d = d == undefined ? "." : d,
				t = t == undefined ? "," : t,
				s = n < 0 ? "-" : "",
				i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
				j = (j = i.length) > 3 ? j % 3 : 0;
			return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
		};

		this.init = function () {
			/** инсертим в свг окружность */
			svg.append("circle")
				.attr("r", outerRadius);

			queue()
				.defer(d3.json, "/app_dev.php/api/billionaires/test") //dynamical by xls
				//.defer(d3.json, "js/data.json")
				.await(function (error, data) {

					if (error) throw error;

					var matrix = data.all.matrix;
					var banks = data.all.list;
					var operations = data.all.op;
					var groups = data.all.groups;

					layout.matrix(matrix);

					var group = svg.selectAll(".group")
						.data(layout.groups)
						.enter().append("g")
						.attr("class", "group")
						.on("mouseover", mouseover)
						.on("mouseleave", mouseleave);


					var groupPath = group.append("path")
						// set ID
						.attr("id", function (d, i) {
							return "group-" + i;
						})
						.attr("d", arc)
						.style("fill-opacity", function (d, i) {
							return getBankColorOpacity(d, data);
						})
						// set color
						.style("fill", function (d, i) {
							return getBankColor(d, data);
						});

					// Add a text label.
					var groupText = group.append("text")
						.attr("x", function (d, i) {
							return 7;
						})
						.attr("dy", 15);

					groupText.append("textPath")
						.attr("xlink:href", function (d, i) {
							return "#group-" + i;
						})
						.text(function (d, i) {
							return banks[i].name;
						});

					// Remove the labels that don't fit. :(
					groupText.filter(function (d, i) {
						return groupPath[0][i].getTotalLength() / 2 - 30 < this.getComputedTextLength();
					}).remove();

					// Add the chords.
					var chord = svg.selectAll(".chord")
						.data(layout.chords)
						.enter().append("path")
						.attr("class", "chord")
						.style("stroke-width", "0.5")
						.style("stroke", "#ccc")
						.style("fill-opacity", function (d) {
							return getShortColorOpacity(d, data);
						})
						.style("fill", function (d) {
							return getShortColor(d, data);
						})
						.attr("d", path)
						.on("mouseover", mouseoverchord)
						.on("mouseleave", mouseleavechord);

					function mouseoverchord(d, i) {
						var shord = this;
						activeElType = "shord";
						shord.addEventListener('mouseover', function(e){
							generateTooltip(d, 'chord', e.layerX, e.layerY);
						}, false);
						generateDesc(d.target);
					}

					function mouseleavechord(d, i) {
						tooltip.hide();
						var wrap = $('.summary', description);
						wrap.html("").hide();
					}

					function mouseover(d, i) {
						activeElType = "group";
						var group = this;
						group.addEventListener('mouseover', function(e){
							generateTooltip(d, 'group', e.layerX, e.layerY);
						}, false);
						generateDesc(d, i);
						chord.classed("fade", function (p) {
							if (p.target.index == i) {
								activeEl = "1";
							}
							if (p.source.index == i) {
								activeEl = "2";
							}
							return p.source.index != i
								&& p.target.index != i;
						});
					}

					function mouseleave(d, i) {
						var wrap = $('.summary', description);
						wrap.html("").hide();
						tooltip.html("").hide();
					}

					function generateTooltip(d, type, x, y) {

						var html = "";
						var bank = (type == "group") ? banks[d.index] : banks[d.target.index];

						if (type == "group") {
							html += bank.name
						} else {
							var op = operations[d.source.index + ":" + d.source.subindex];
							html += "<div style='border-bottom: 1px #fff solid; padding-bottom: 2px; margin-bottom: 2px; '>" +  bank.name + "</div>";
							html += (op.data.data != "") ? "<div>Дата: " + op.data.data + "</div>" : "";
							html += "<div>Сумма: " + formatMoney(op.summ, 0, '.', ' ') + "</div>";
						}

						tooltip.html(html);
						tooltip.css('top', y + 15);
						tooltip.css('left', x + 15);
						tooltip.show();
					}


					function generateDesc(d, i){

						var wrap = $('.summary', description);
						var html = "";
						var bank = banks[d.index];
						var op = [];
						var max = 1;

						if (bank.group !== null || bank.name == "Прочие объеты поглащения") {
							bank.group = "group1"; // hardcode - buy I tired... sorry
							var group = groups[bank.group];
							for (var key in group) {
								if (group[key].value > max) {
									max = group[key].value;
								}
							}

							for (var key in group) {
								var percent = (1 * (group[key].value * 100 / bank.value) / 100).toFixed(2);
								var opacity = (1 * (group[key].value * 100 / max) / 100).toFixed(2);
								var color = colors[0];
								var data = (group[key].data !== undefined) ? group[key].data : "";
								op.push({
									parent: group[key].parent,
									bank: group[key].name,
									value: group[key].value,
									color: color,
									percent: percent,
									opacity: (opacity < 0.3 ? 0.3 : opacity),
									data: data
								});
							}

							html += "<ul>";
							for (var key in op) {
								html += "<li class='bank'>";
								html += "<span class='name head'>" + op[key].parent + "</span>";
								html += "<span class='op' style='width: " + op[key].percent * 100 + "%;'>";
								html += "<i class='color blue' style='opacity:" + op[key].opacity + ";'></i>";
								html += "<i class='value'>" + formatMoney(op[key].value, 0, '.', ' ') + "</i>";
								html += "</span>";
								html += "</li>";
								html += "<li class='bank'>";
								html += "<span class='name'>" + op[key].bank + "<i class='data'>" + op[key].data + "</i></span>";
								html += "<span class='op' style='width: " + op[key].percent * 100 + "%;'>";
								html += "<i class='color " + op[key].color + "' style='opacity:" + op[key].opacity + ";'></i>";
								html += "<i class='value'>" + formatMoney(op[key].value, 0, '.', ' ') + "</i>";
								html += "</span>";
								html += "</li>";
							}

							html += "</ul>";
							wrap.html(html).show();

						} else {

							var last = null;
							var di = d.index;

							if (activeEl === null) {
								if ((banks[di].type == 'a' || banks[di].type == 's')) {
									activeEl = 1;
								} else {
									activeEl = 2;
								}
							}

							if ((bank.type == 'a' || bank.type == 's')) {

								if (activeEl == 2) {
									for (var key in operations) {
										var index = key.split(':');
										if (index[0] == di && operations[key].type != -1) {
											di = index[1];
											bank = banks[di];
										}
									}
								}
							}


							for (var key in operations) {
								var index = key.split(':');
								if (index[0] == di && operations[key].type != -1) {
									if (operations[key].summ > max) {
										max = operations[key].summ;
									}
								}
							}

							for (var key in operations) {
								var index = key.split(':');
								if (index[0] == di && operations[key].type != -1) {
									var percent = (1 * (operations[key].summ * 100 / bank.value) / 100).toFixed(2);
									var opacity = (1 * (operations[key].summ * 100 / max) / 100).toFixed(2);
									var color = colors[operations[key].type];
									var data = (operations[key].data.data !== undefined) ? operations[key].data.data : "";
									op.push({
										bank: banks[index[1]],
										value: operations[key].summ,
										color: color,
										percent: percent,
										opacity: (opacity < 0.3 ? 0.3 : opacity),
										data: data
									});
									last = key;
								}
							}

							if ((bank.type == 'a' || bank.type == 's') && (activeEl == 1)) {
								var tmp = bank;
								bank = op[0].bank;
								op[0].data = (operations[last] !== undefined) ? operations[last].data.data : '';
								op[0].bank = tmp;
								op[0].percent = (1 * (op[0].value * 100 / bank.value) / 100).toFixed(2);
							}

							html += "<ul>";
							html += "<li class='bank'>";
							html += "<span class='name head'>" + bank.name + "</span>";
							html += "<span class='op'><i class='color blue' style='width: 100%'></i> <i class='value'>" + formatMoney(bank.value, 0, '.', ' ') + "</i></span>";
							html += "</li>";

							for (var key in op) {
								html += "<li class='bank'>";
								html += "<span class='name'>" + op[key].bank.name + "<i class='data'>" + op[key].data + "</i></span>";
								html += "<span class='op' style='width: " + op[key].percent * 100 + "%;'>";
								html += "<i class='color " + op[key].color + "' style='opacity:" + op[key].opacity + ";'></i>";
								html += "<i class='value'>" + formatMoney(op[key].bank.value, 0, '.', ' ') + "</i>";
								html += "</span>";
								html += "</li>";
							}

							html += "</ul>";
							wrap.html(html).show();
						}

					}

				})
		}
	}

	var graph = new infoBankGraphic();
	graph.init();
	//var arr = ['blue', 'yellow', 'green'];
	//for (color in arr) {
	//	$('.'+arr[color]+'.item i').css('background', '-webkit-gradient(linear, left center, right center, from('+defineColor(arr[color])+'),color-stop(100%, '+defineColor(arr[color])+'))');
	//	$('.'+arr[color]+'.item i').css('background', '-webkit-linear-gradient(left,'+defineColor(arr[color])+' ,'+defineColor(arr[color])+' 100%)');
	//	$('.'+arr[color]+'.item i').css('background', 'linear-gradient(to right,'+defineColor(arr[color])+' ,'+defineColor(arr[color])+' 100%)');
	//	$('.'+arr[color]+'.item i').css('filter', 'progid:DXImageTransform.Microsoft.gradient(startColorstr='+defineColor(arr[color])+', endColorstr='+defineColor(arr[color])+', GradientType=1)');
	//	$('.'+arr[color]+'.item i').css('-ms-filter', '"progid:DXImageTransform.Microsoft.gradient(startColorstr=\''+defineColor(arr[color])+'\', endColorstr=\''+defineColor(arr[color])+'\', GradientType=1)"');
	//
	//}
})