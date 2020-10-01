const EventEmitter = require("events");

// For testing and proof of concept. This game is very simple and boring
class TicTacToeGame extends EventEmitter {
    constructor(...players) {
        super();

        this.board = [
            [-1, -1, -1],
            [-1, -1, -1],
            [-1, -1, -1],
        ];
        this.players = players;
        this.turn = 0;
        this.complete = false;
        this.stopped = false;
        this.winnerId = null;
    }

    set(x, y) {
        if (this.stopped || this.complete || this.board[x][y] !== -1) {
            return false;
        }
        
        this.board[x][y] = this.turn;

        const winner = this.checkWin();
        if (winner || winner === null) {
            if (winner) {
                this.winnerId = this.turn;
            }
            
            this.complete = true;
            this.emit("end");
            return true;
        }

        this.turn = this.turn === 0 ? 1 : 0;

        return true;
    }

    checkWin() {
        const allEqualIn = array => array.every(value => value === array[0]);

        // Verticals
        for (let x = 0; x < 3; x++) {
            const col = this.getCol(x);
            if (col.includes(-1)) continue;
            if (allEqualIn(col)) return this.currentPlayer;
        }

        // Horizontals
        for (let y = 0; y < 3; y++) {
            const row = this.getRow(y);
            if (row.includes(-1)) continue;
            if (allEqualIn(row)) return this.currentPlayer;
        }

        // Diagonals
        for (let i = 0; i <= 1; i++) {
            const diag = this.getDiag(i);
            if (diag.includes(-1)) continue;
            if (allEqualIn(diag)) return this.currentPlayer;
        }

        if (!this.board.flat().includes(-1)) {
            return null;
        }

        return false;
    }

    getRow(y) {
        return [this.board[0][y], this.board[1][y], this.board[2][y]];
    }

    getCol(x) {
        return this.board[x];
    }

    getDiag(direction=0) {
        return direction === 0
                ? [this.board[0][0], this.board[1][1], this.board[2][2]]
                : [this.board[2][0], this.board[1][1], this.board[0][2]];
    }

    getEmptyPositions() {
        const result = [];
        for (let x = 0; x < this.board.length; x++) {
            const row = this.board[x];
            for (let y = 0; y < row.length; y++) {
                if (this.board[x][y] === -1) {
                    result.push([x, y]);
                }
            }
        }
        return result;
    }

    stop() {
        if (this.stopped) return;

        this.stopped = true;
        this.emit("end");
    }

    get currentPlayer() {
        return this.players[this.turn];
    }
    
    get otherPlayer() {
        return this.players[this.turn === 0 ? 1 : 0];
    }
}

module.exports = TicTacToeGame;