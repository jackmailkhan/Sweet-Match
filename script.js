
        class SweetMatch {
            constructor() {
                this.board = [];
                this.boardSize = 9;
                this.colors = ['red', 'blue', 'green', 'yellow'];
                this.score = 0;
                this.level = 1;
                this.moves = 30;
                this.timeLeft = 60;
                this.selectedTile = null;
                this.gameActive = false;
                this.timer = null;
                this.gameMode = 'moves';
                this.levelTargets = [1000, 2500, 5000, 8000, 12000, 20000, 35000];
                this.comboCount = 0;
                this.starsEarned = 0;
                this.bestScore = parseInt(localStorage.getItem('sweetMatchBest')) || 0;
                this.soundEnabled = localStorage.getItem('sweetMatchSound') !== 'false';
                this.audioContext = null;
                this.backgroundMusic = null;
                this.initAudio();
                this.updateSoundButton();
            }

            initAudio() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.createBackgroundMusic();
                } catch (e) {
                    console.log('Audio not supported');
                }
            }

            createBackgroundMusic() {
                if (!this.audioContext || !this.soundEnabled) return;

                // Create a simple background music loop
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Sweet, cheerful melody
                const melody = [523.25, 659.25, 783.99, 523.25, 659.25, 783.99, 880.00, 783.99];
                let noteIndex = 0;
                
                const playNextNote = () => {
                    if (!this.soundEnabled) return;
                    
                    oscillator.frequency.setValueAtTime(melody[noteIndex], this.audioContext.currentTime);
                    noteIndex = (noteIndex + 1) % melody.length;
                    
                    setTimeout(playNextNote, 1000);
                };
                
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                oscillator.start();
                
                this.backgroundMusic = { oscillator, gainNode };
                playNextNote();
            }

            toggleSound() {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('sweetMatchSound', this.soundEnabled.toString());
                this.updateSoundButton();
                
                if (!this.soundEnabled && this.backgroundMusic) {
                    this.backgroundMusic.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                } else if (this.soundEnabled && !this.backgroundMusic) {
                    this.createBackgroundMusic();
                } else if (this.soundEnabled && this.backgroundMusic) {
                    this.backgroundMusic.gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                }
            }

            updateSoundButton() {
                const button = document.getElementById('soundToggle');
                button.textContent = this.soundEnabled ? '🔊' : '🔇';
            }

            playSound(frequency, duration, type = 'sine', volume = 0.3) {
                if (!this.audioContext || !this.soundEnabled) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration);
            }

            initBoard() {
                this.board = [];
                let attempts = 0;
                const maxAttempts = 100;
                
                do {
                    this.board = [];
                    for (let row = 0; row < this.boardSize; row++) {
                        this.board[row] = [];
                        for (let col = 0; col < this.boardSize; col++) {
                            this.board[row][col] = this.getRandomColor();
                        }
                    }
                    attempts++;
                } while (this.hasInitialMatches() && attempts < maxAttempts);
                
                if (attempts >= maxAttempts) {
                    this.removeAllMatches();
                }

                // Adjust board size for mobile
                if (window.innerWidth <= 768) {
                    this.boardSize = 8;
                    this.initBoard(); // Reinitialize with smaller size
                }
            }

            hasInitialMatches() {
                return this.findMatches().length > 0;
            }

            removeAllMatches() {
                let matches = this.findMatches();
                while (matches.length > 0) {
                    matches.forEach(match => {
                        this.board[match.row][match.col] = this.getRandomColor();
                    });
                    matches = this.findMatches();
                }
            }

            getRandomColor() {
                return this.colors[Math.floor(Math.random() * this.colors.length)];
            }

            renderBoard() {
                const gameBoard = document.getElementById('gameBoard');
                gameBoard.innerHTML = '';
                
                for (let row = 0; row < this.boardSize; row++) {
                    for (let col = 0; col < this.boardSize; col++) {
                        const tile = document.createElement('div');
                        tile.className = `tile ${this.board[row][col]}`;
                        tile.dataset.row = row;
                        tile.dataset.col = col;
                        tile.addEventListener('click', (e) => this.handleTileClick(e));
                        tile.addEventListener('touchstart', (e) => {
                            e.preventDefault();
                            this.handleTileClick(e);
                        });
                        gameBoard.appendChild(tile);
                    }
                }
            }

            handleTileClick(e) {
                if (!this.gameActive) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const tile = e.target.closest('.tile');
                if (!tile) return;
                
                const row = parseInt(tile.dataset.row);
                const col = parseInt(tile.dataset.col);

                if (this.selectedTile) {
                    const selectedRow = this.selectedTile.row;
                    const selectedCol = this.selectedTile.col;
                    
                    if (selectedRow === row && selectedCol === col) {
                        this.clearSelection();
                        this.playSound(400, 0.1);
                        return;
                    }

                    if (this.areAdjacent({row: selectedRow, col: selectedCol}, {row, col})) {
                        this.swapTiles({row: selectedRow, col: selectedCol}, {row, col});
                    } else {
                        this.clearSelection();
                        this.selectTile(tile, row, col);
                    }
                } else {
                    this.selectTile(tile, row, col);
                }
            }

            selectTile(tile, row, col) {
                this.selectedTile = {row, col, element: tile};
                tile.classList.add('selected');
                this.playSound(600, 0.15);
            }

            clearSelection() {
                if (this.selectedTile && this.selectedTile.element) {
                    this.selectedTile.element.classList.remove('selected');
                }
                this.selectedTile = null;
            }

            areAdjacent(tile1, tile2) {
                const rowDiff = Math.abs(tile1.row - tile2.row);
                const colDiff = Math.abs(tile1.col - tile2.col);
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            }

            swapTiles(tile1, tile2) {
                const temp = this.board[tile1.row][tile1.col];
                this.board[tile1.row][tile1.col] = this.board[tile2.row][tile2.col];
                this.board[tile2.row][tile2.col] = temp;

                this.clearSelection();
                this.renderBoard();

                setTimeout(() => {
                    const matches = this.findMatches();
                    if (matches.length > 0) {
                        this.comboCount = 1;
                        this.processMatches();
                        if (this.gameMode === 'moves') {
                            this.moves--;
                            this.updateUI();
                        }
                        this.playSound(800, 0.4, 'triangle');
                    } else {
                        const temp2 = this.board[tile1.row][tile1.col];
                        this.board[tile1.row][tile1.col] = this.board[tile2.row][tile2.col];
                        this.board[tile2.row][tile2.col] = temp2;
                        this.renderBoard();
                        this.playSound(300, 0.3);
                    }
                }, 100);
            }

            findMatches() {
                const matches = new Set();
                
                // Find horizontal matches
                for (let row = 0; row < this.boardSize; row++) {
                    let count = 1;
                    let currentColor = this.board[row][0];
                    
                    for (let col = 1; col < this.boardSize; col++) {
                        if (this.board[row][col] === currentColor) {
                            count++;
                        } else {
                            if (count >= 3) {
                                for (let i = col - count; i < col; i++) {
                                    matches.add(`${row},${i}`);
                                }
                            }
                            count = 1;
                            currentColor = this.board[row][col];
                        }
                    }
                    
                    if (count >= 3) {
                        for (let i = this.boardSize - count; i < this.boardSize; i++) {
                            matches.add(`${row},${i}`);
                        }
                    }
                }

                // Find vertical matches
                for (let col = 0; col < this.boardSize; col++) {
                    let count = 1;
                    let currentColor = this.board[0][col];
                    
                    for (let row = 1; row < this.boardSize; row++) {
                        if (this.board[row][col] === currentColor) {
                            count++;
                        } else {
                            if (count >= 3) {
                                for (let i = row - count; i < row; i++) {
                                    matches.add(`${i},${col}`);
                                }
                            }
                            count = 1;
                            currentColor = this.board[row][col];
                        }
                    }
                    
                    if (count >= 3) {
                        for (let i = this.boardSize - count; i < this.boardSize; i++) {
                            matches.add(`${i},${col}`);
                        }
                    }
                }

                return Array.from(matches).map(pos => {
                    const [row, col] = pos.split(',').map(Number);
                    return {row, col};
                });
            }

            processMatches() {
                const matches = this.findMatches();
                if (matches.length === 0) {
                    this.comboCount = 0;
                    this.checkGameEnd();
                    return;
                }

                // Calculate score with combo multiplier
                const baseScore = matches.length * 150;
                const comboBonus = baseScore * this.comboCount * 0.8;
                const levelBonus = baseScore * this.level * 0.3;
                const totalScore = Math.floor(baseScore + comboBonus + levelBonus);
                
                this.score += totalScore;
                this.updateUI();

                // Show combo text if applicable
                if (this.comboCount > 1) {
                    this.showComboText(this.comboCount, totalScore);
                }

                // Play match sound with pitch based on combo
                this.playSound(800 + (this.comboCount * 200), 0.5, 'triangle');

                // Animate matching tiles
                matches.forEach(match => {
                    const tileElement = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
                    if (tileElement) {
                        tileElement.classList.add('matching');
                        this.createParticles(tileElement);
                    }
                });

                // Remove matches and apply gravity after animation
                setTimeout(() => {
                    matches.forEach(match => {
                        this.board[match.row][match.col] = null;
                    });
                    this.applyGravity();
                }, 600);
            }

            showComboText(combo, score) {
                const comboElement = document.createElement('div');
                comboElement.className = 'combo-text';
                comboElement.textContent = `COMBO x${combo}! +${score}`;
                
                const gameBoard = document.getElementById('gameBoard');
                const rect = gameBoard.getBoundingClientRect();
                comboElement.style.left = (rect.left + rect.width/2) + 'px';
                comboElement.style.top = (rect.top + rect.height/2) + 'px';
                comboElement.style.transform = 'translate(-50%, -50%)';
                
                document.body.appendChild(comboElement);
                
                setTimeout(() => {
                    if (comboElement.parentNode) {
                        comboElement.parentNode.removeChild(comboElement);
                    }
                }, 1500);
            }

            createParticles(element) {
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const colors = ['#FFD700', '#FF69B4', '#00FF00', '#FF4500', '#9370DB'];

                for (let i = 0; i < 8; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'particle';
                    particle.style.left = centerX + 'px';
                    particle.style.top = centerY + 'px';
                    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.setProperty('--dx', (Math.random() - 0.5) * 120 + 'px');
                    particle.style.setProperty('--dy', (Math.random() - 0.5) * 120 + 'px');
                    document.body.appendChild(particle);

                    setTimeout(() => particle.remove(), 1200);
                }
            }

            applyGravity() {
                let moved = false;
                
                // Make tiles fall
                for (let col = 0; col < this.boardSize; col++) {
                    let writePos = this.boardSize - 1;
                    
                    for (let row = this.boardSize - 1; row >= 0; row--) {
                        if (this.board[row][col] !== null) {
                            if (writePos !== row) {
                                this.board[writePos][col] = this.board[row][col];
                                this.board[row][col] = null;
                                moved = true;
                            }
                            writePos--;
                        }
                    }
                    
                    // Fill empty spaces with new tiles
                    for (let row = writePos; row >= 0; row--) {
                        this.board[row][col] = this.getRandomColor();
                        moved = true;
                    }
                }

                this.renderBoard();

                if (moved) {
                    // Add falling animation
                    const tiles = document.querySelectorAll('.tile');
                    tiles.forEach(tile => tile.classList.add('falling'));
                    
                    setTimeout(() => {
                        tiles.forEach(tile => tile.classList.remove('falling'));
                        
                        // Check for new matches (combo)
                        const newMatches = this.findMatches();
                        if (newMatches.length > 0) {
                            this.comboCount++;
                            this.processMatches();
                        } else {
                            this.comboCount = 0;
                            this.checkGameEnd();
                        }
                    }, 400);
                } else {
                    this.comboCount = 0;
                    this.checkGameEnd();
                }
            }

            updateUI() {
                document.getElementById('score').textContent = this.score.toLocaleString();
                document.getElementById('level').textContent = this.level;
                document.getElementById('moves').textContent = this.moves;
                document.getElementById('timer').textContent = this.timeLeft;
                document.getElementById('target').textContent = this.levelTargets[this.level - 1]?.toLocaleString() || 'MAX';
                document.getElementById('bestScore').textContent = this.bestScore.toLocaleString();

                // Update progress bar and stars
                const target = this.levelTargets[this.level - 1] || this.score;
                const progress = Math.min(this.score / target, 1);
                const progressFill = document.getElementById('progressFill');
                
                if (window.innerWidth <= 768) {
                    progressFill.style.width = (progress * 100) + '%';
                } else {
                    progressFill.style.height = (progress * 100) + '%';
                }

                // Update stars based on progress
                const starThresholds = [0.33, 0.66, 1.0];
                for (let i = 0; i < 3; i++) {
                    const star = document.getElementById(`star${i + 1}`);
                    if (progress >= starThresholds[i] && !star.classList.contains('earned')) {
                        star.classList.add('earned');
                        this.starsEarned++;
                        this.playSound(1200, 0.6, 'triangle', 0.4);
                    }
                }
            }

            checkGameEnd() {
                // Update best score
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    localStorage.setItem('sweetMatchBest', this.bestScore.toString());
                    this.updateUI();
                }

                // Check win condition
                if (this.score >= this.levelTargets[this.level - 1]) {
                    this.levelUp();
                    return;
                }

                // Check lose conditions
                if ((this.gameMode === 'moves' && this.moves <= 0) || 
                    (this.gameMode === 'time' && this.timeLeft <= 0)) {
                    this.gameOver();
                }
            }

            levelUp() {
                if (this.level >= this.levelTargets.length) {
                    this.gameWin();
                    return;
                }

                this.level++;
                this.moves = Math.max(20, 40 - this.level * 2);
                this.timeLeft = Math.max(40, 80 - this.level * 5);
                
                // Add more colors for higher levels
                if (this.level === 3 && this.colors.length < 5) {
                    this.colors.push('purple');
                }
                if (this.level === 5 && this.colors.length < 6) {
                    this.colors.push('orange');
                }

                // Play level up sound
                this.playSound(1000, 1.0, 'triangle', 0.5);
                this.showLevelComplete();
            }

            showLevelComplete() {
                const content = document.getElementById('gameOverContent');
                
                content.innerHTML = `
                    <div class="level-complete">🎉 LEVEL ${this.level - 1} COMPLETE! 🎉</div>
                    <div class="final-score">Amazing! Score: ${this.score.toLocaleString()}</div>
                    <div style="margin: 1.5rem 0;">
                        <div style="font-size: 1.3rem; color: #FFD700;">⭐ Stars Earned: ${this.starsEarned} ⭐</div>
                        <div style="font-size: 1.1rem; margin-top: 0.5rem;">Next Target: ${this.levelTargets[this.level - 1]?.toLocaleString() || 'FINAL LEVEL'}</div>
                    </div>
                    <button class="restart-button" onclick="game.continueGame()">🍩 CONTINUE ADVENTURE</button>
                    <button class="restart-button" onclick="restartGame()">🔄 RESTART GAME</button>
                `;

                this.showScreen('gameOverScreen');
                this.gameActive = false;
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
            }

            continueGame() {
                this.starsEarned = 0; // Reset stars for new level
                this.initBoard();
                this.renderBoard();
                this.updateUI();
                this.showScreen('gameScreen');
                this.gameActive = true;
                this.startTimer();
            }

            gameWin() {
                const content = document.getElementById('gameOverContent');
                content.innerHTML = `
                    <div class="level-complete">🏆 ULTIMATE SWEET CHAMPION! 🏆</div>
                    <div style="font-size: 1.8rem; margin: 1rem 0; color: #FFD700;">You conquered all levels!</div>
                    <div class="final-score">LEGENDARY SCORE: ${this.score.toLocaleString()}</div>
                    <div style="margin: 1rem 0;">
                        <div style="font-size: 1.2rem; color: #FFD700;">⭐ Total Stars: ${this.starsEarned} ⭐</div>
                    </div>
                    <button class="restart-button" onclick="restartGame()">🍩 PLAY AGAIN</button>
                    <button class="menu-button" onclick="showStartScreen()">🏠 MAIN MENU</button>
                `;
                this.showScreen('gameOverScreen');
                this.gameActive = false;
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                
                // Victory fanfare
                this.playSound(1500, 2.0, 'triangle', 0.6);
            }

            gameOver() {
                document.getElementById('gameOverTitle').textContent = this.moves <= 0 ? 'No More Moves!' : 'Time\'s Up!';
                document.getElementById('finalScore').textContent = this.score.toLocaleString();
                document.getElementById('finalLevel').textContent = this.level;
                document.getElementById('starsEarned').textContent = this.starsEarned;
                
                this.showScreen('gameOverScreen');
                this.gameActive = false;
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                
                // Game over sound
                this.playSound(400, 1.5, 'sawtooth', 0.4);
            }

            startTimer() {
                if (this.gameMode !== 'time') {
                    document.getElementById('timerDisplay').style.display = 'none';
                    return;
                }
                
                document.getElementById('timerDisplay').style.display = 'block';
                
                if (this.timer) {
                    clearInterval(this.timer);
                }
                
                this.timer = setInterval(() => {
                    this.timeLeft--;
                    this.updateUI();
                    
                    // Warning sounds for low time
                    if (this.timeLeft <= 10 && this.timeLeft > 0) {
                        this.playSound(800, 0.2, 'square', 0.3);
                    }
                    
                    if (this.timeLeft <= 0) {
                        this.gameOver();
                    }
                }, 1000);
            }

            showScreen(screenId) {
                const screens = ['startScreen', 'gameScreen', 'gameOverScreen'];
                screens.forEach(id => {
                    const screen = document.getElementById(id);
                    if (screen) {
                        screen.classList.remove('active');
                    }
                });
                
                const targetScreen = document.getElementById(screenId);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                }
            }

            start() {
                this.score = 0;
                this.level = 1;
                this.moves = 30;
                this.timeLeft = 60;
                this.starsEarned = 0;
                this.colors = ['red', 'blue', 'green', 'yellow'];
                this.gameMode = Math.random() > 0.6 ? 'moves' : 'time';
                
                // Reset progress bar and stars
                document.getElementById('progressFill').style.height = '0%';
                document.getElementById('progressFill').style.width = '0%';
                for (let i = 1; i <= 3; i++) {
                    document.getElementById(`star${i}`).classList.remove('earned');
                }
                
                this.initBoard();
                this.renderBoard();
                this.updateUI();
                this.showScreen('gameScreen');
                this.gameActive = true;
                this.startTimer();
                
                // Start game sound
                this.playSound(600, 0.8, 'triangle', 0.4);
            }

            restart() {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                this.start();
            }
        }

        // Initialize game
        let game = new SweetMatch();

        // Global functions
        function startGame() {
            game.start();
        }

        function restartGame() {
            game.restart();
        }

        function showStartScreen() {
            game.showScreen('startScreen');
            game.gameActive = false;
            if (game.timer) {
                clearInterval(game.timer);
                game.timer = null;
            }
        }

        function toggleSound() {
            game.toggleSound();
        }

        // Initialize audio on first user interaction
        document.addEventListener('click', function initAudio() {
            if (game.audioContext && game.audioContext.state === 'suspended') {
                game.audioContext.resume();
            }
            document.removeEventListener('click', initAudio);
        }, { once: true });

        // Prevent zoom and scrolling on mobile
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (game.gameActive) {
                setTimeout(() => {
                    game.renderBoard();
                    game.updateUI();
                }, 100);
            }
        });
