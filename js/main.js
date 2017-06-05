~ function() {

		'use strict';

		var clusters = [],
				actionQueue = [],
				pProgress = 0,
				currentFile,
				currentFragment,
				currentWriteCluster,
				nClusters,
				tClusters,
				MFC,
				nx,
				ny,

				imgClear = function(p) {
						canvas.fillRect(p.x, p.y, 8, 10, '#fff');
				},

				imgGrid = function(p, c) {
						for (var i = 2; i < 9; i++) {
								for (var j = 2; j < 7; j += 2) {
										canvas.fillRect(
												p.x + j + ((i / 2 !== Math.floor(i / 2)) ? 1 : 0),
												p.y + i, 1, 1, c);
								}
						}
				},

				imgVisu = function(p) {
						// dark
						canvas.fillRect(p.x + 1, p.y + 1, 7, 9, '#000');
						imgGrid(p, '#007b7b');
				},

				imgRead = function(p) {
						canvas.fillRect(p.x + 1, p.y + 1, 7, 9, '#000');
						canvas.fillRect(p.x + 2, p.y + 2, 5, 7, '#f00');
				},

				imgDefrag = function(p) {
						canvas.fillRect(p.x + 1, p.y + 1, 7, 9, '#000');
						canvas.fillRect(p.x + 2, p.y + 2, 5, 7, '#00ffff');
						imgGrid(p, '#0000ff');
				},

				imgFrag = function(p) {
						canvas.fillRect(p.x + 1, p.y + 1, 7, 9, '#000');
						canvas.fillRect(p.x + 2, p.y + 2, 5, 7, '#00ffff');
				},

				imgNoMove = function(p) {
						canvas.fillRect(p.x + 1, p.y + 1, 7, 9, '#000');
						canvas.fillRect(p.x + 2, p.y + 2, 5, 7, '#fff');
						canvas.fillRect(p.x + 4, p.y + 1, 4, 4, '#000');
						canvas.fillRect(p.x + 4, p.y + 2, 4, 1, '#f00');
						canvas.fillRect(p.x + 6, p.y + 1, 1, 4, '#f00');
						canvas.fillRect(p.x + 7, p.y + 1, 1, 1, '#f00');
				},

				progressBar = function() {
						var progress = Math.floor(
								(currentWriteCluster * (canvas.resolutionX - 24) / tClusters) / 10
						);
						if (progress != pProgress) {
								pProgress = progress;
								for (var i = 0; i < progress; i++) {
										canvas.fillRect(10 + i * 10, canvas.resolutionY - 21, 8, 12, '#000082');
								}
						}
				},

				screenPos = function(cluster) {
						return {
								x: Math.floor(cluster % nx) * 8,
								y: Math.floor(cluster / nx) * 10
						};
				},

				largestBloc = function(start, minSize) {
						var big = 0,
								pos = 0,
								bm = 0,
								pm = 0;
						for (var i = nClusters - 1; i > start; i--) {
								var cluster = clusters[i];
								if (cluster) {
										if (big >= minSize) {
												return {
														position: pos,
														size: big
												};
										}
										if (big > bm) {
												bm = big;
												pm = pos;
										}
										big = 0;
								} else {
										big++;
										pos = i;
								}
						}
						return {
								position: pm,
								size: bm
						};
				},

				inFragment = function(pos, file, fragment) {
						return (
								clusters[pos] &&
								clusters[pos].file === file &&
								clusters[pos].fragment === fragment
						);
				},

				sizeFragment = function(pos) {
						var size = 0,
								file = clusters[pos].file,
								fragment = clusters[pos].fragment;
						while (inFragment(pos, file, fragment)) {
								size++;
								pos++;
						}
						return size;
				},

				locateFragment = function(file, fragment) {
						var pos = -1;
						for (var i = 0; i < nClusters; i++) {
								if (inFragment(i, file, fragment)) {
										pos = i;
										break;
								}
						}
						return pos;
				},

				visualizeFile = function(file) {
						for (var i = 0; i < nClusters; i++) {
								if (clusters[i] && clusters[i].file === file) {
										imgVisu(screenPos(i));
								}
						}
				},

				next = function() {
						currentFragment++;
						var pos = locateFragment(currentFile, currentFragment);
						if (pos < 0) {
								currentFile++;
								currentFragment = 1;
								var pos = locateFragment(currentFile, currentFragment);
								if (currentFile === MFC) {
										currentFile++;
										var pos = locateFragment(currentFile, currentFragment);
								}
								visualizeFile(currentFile);
								if (pos < 0) return;
						}
						actionQueue.push(clusters[currentWriteCluster] ? [clear] : [move]);
				},

				readCluster = function(cluster) {
						imgRead(screenPos(cluster));
				},

				wait = function(n) {
						for (var i = 0; i < n; i++) {
								actionQueue.push([]);
						}
				},

				clear = function() {
						var fragment = clusters[currentWriteCluster];
						var size = sizeFragment(currentWriteCluster);
						var big = largestBloc(currentWriteCluster + size, size);
						if (size <= big.size) {
								for (var i = currentWriteCluster; i < currentWriteCluster + size; i++) {
										readCluster(i);
								}
								wait(12);
								actionQueue.push([removeBlock, currentWriteCluster, size]);
								var pos = big.position;
								for (var i = 0; i < size; i++) {
										actionQueue.push([moveCluster, pos++, fragment]);
								}
								actionQueue.push([move]);
						} else {
								split(currentWriteCluster, fragment.file, fragment.fragment, big.size, size);
								actionQueue.push([clear]);
						}
				},

				split = function(pos, file, fragment, freeSpace, size) {
						for (var i = 0; i < nClusters; i++) {
								var cluster = clusters[i];
								if (cluster && cluster.file === file && cluster.fragment > fragment) {
										cluster.fragment++;
								}
						}
						for (var i = pos + freeSpace; i < pos + size; i++) {
								var cluster = clusters[i];
								cluster.fragment++;
						}
				},

				defragCluster = function(file, fragment) {
						imgDefrag(screenPos(currentWriteCluster));
						clusters[currentWriteCluster] = {
								file: file,
								fragment: fragment,
								move: false
						};
						currentWriteCluster++;
						while (clusters[currentWriteCluster] && !clusters[currentWriteCluster].move) {
								currentWriteCluster++;
						}
				},

				moveCluster = function(pos, fragment) {
						imgFrag(screenPos(pos));
						clusters[pos] = {
								file: fragment.file,
								fragment: fragment.fragment,
								move: true
						};
				},

				removeBlock = function(pos, len) {
						var fragment = clusters[pos];
						for (var i = 0; i < len; i++) {
								clusters[pos] = null;
								imgClear(screenPos(pos++));
						}
				},

				move = function() {
						var freeSpace = 0;
						var i = currentWriteCluster;
						while (!clusters[i++]) {
								freeSpace++;
						};
						var pos = locateFragment(currentFile, currentFragment);
						var size = sizeFragment(pos);
						if (freeSpace >= size) {
								var p = pos;
								for (var i = 0; i < size; i++) {
										readCluster(p++);
								}
								wait(10);
								actionQueue.push([removeBlock, pos, size]);
								for (var i = 0; i < size; i++) {
										actionQueue.push([defragCluster, currentFile, currentFragment]);
								}
								actionQueue.push([next]);
						} else {
								split(pos, currentFile, currentFragment, freeSpace, size);
								actionQueue.push([move]);
						}
				},

				defrag = function() {
						window.requestAnimationFrame(defrag);
						var exec = actionQueue.shift();
						exec && exec[0] && exec[0](exec[1], exec[2], exec[3]);
						progressBar();
				},

				init = function() {
						tClusters = 0;
						currentFile = 1;
						currentFragment = 0;
						currentWriteCluster = 0;
						clusters.length = 0;
						actionQueue.length = 0;
						nx = Math.floor(canvas.resolutionX / 8);
						ny = Math.floor(canvas.resolutionY / 10);
						nClusters = nx * (ny - 3);
						var i = nClusters * 0.8,
								k = 0,
								nFiles = 1;
						do {
								var fileSize = Math.floor(Math.random() * i * 0.5) || 1,
										j = fileSize,
										nFragments = 1;
								do {
										do {
												var fragmentSize = Math.floor(Math.random() * j * 0.5) || 1,
														free = true,
														tries = 0;
												do {
														var position = Math.floor(Math.random() * (nClusters - fragmentSize));
														for (var k = position; k < position + fragmentSize; k++) {
																if (clusters[k]) {
																		tries++;
																		free = false;
																		break;
																}
														}
												} while (!free && tries < 50);
												if (!free) {
														if (j === 0) {
																i = 0;
																break;
														}
														if (j > 1) j--;
												}
										} while (!free);
										if (free) {
												if (!MFC && nFiles > 6) MFC = nFiles;
												for (var k = position; k < position + fragmentSize; k++) {
														var move = nFiles === MFC ? false : true;
														clusters[k] = {
																file: nFiles,
																fragment: nFragments,
																move: move
														};
														move ? imgFrag(screenPos(k)) : imgNoMove(screenPos(k));
														tClusters++;
												}
												nFragments++;
										}
										j -= fragmentSize;
								} while (j > 0);
								nFiles++;
								i -= fileSize;
						} while (i);
						var y = canvas.resolutionY - 30,
								w = canvas.resolutionX - 16;
						canvas.fillRect(0, y, canvas.resolutionX + 1, 30, '#C3C3C3');
						canvas.fillRect(8, y + 7, w, 1, '#828282');
						canvas.fillRect(8, y + 7, 1, 15, '#828282');
						canvas.fillRect(8, y + 7 + 15, w, 1, '#ffffff');
						canvas.fillRect(w + 8, y + 8, 1, 15, '#ffffff');
						visualizeFile(1);
						actionQueue.push([next]);
				},

				canvas = {
						elem: document.createElement('canvas'),
						resize: function() {
								this.width = this.elem.offsetWidth;
								this.height = this.elem.offsetHeight;
								this.resolutionX = 800;
								if (window.location.href.indexOf("fullcpgrid") > -1 || this.width < 600) this.resolutionX = 400;
								this.resolutionY = Math.round(this.resolutionX * this.height / this.width);
								this.elem.width = this.resolutionX + 1;
								this.elem.height = this.resolutionY;
								init();
						},
						init: function() {
								this.ctx = this.elem.getContext('2d');
								document.body.appendChild(this.elem);
								window.addEventListener('resize', this.resize.bind(this), false);
								this.resize();
						},
						fillRect: function(x, y, w, h, c) {
								this.ctx.fillStyle = c;
								this.ctx.fillRect(x, y, w, h);
						}
				};

		canvas.init();
		defrag();

}();
