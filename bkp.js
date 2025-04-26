
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Phaser from 'phaser';

class Tile {
  scene: Phaser.Scene;
  left: number;
  right: number;
  sprite!: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, left: number, right: number) {
    this.scene = scene;
    this.left = left;
    this.right = right;
  }

  createSprite(x: number, y: number) {
    // Ajuste para garantir que a chave da imagem esteja correta
    const min = Math.min(this.left, this.right);
    const max = Math.max(this.left, this.right);
    const key = `tile_${min}_${max}`;
    this.sprite = this.scene.add.sprite(x, y, key);
    this.sprite.setInteractive();
  }

  placeAtPosition(x: number, y: number, rotation: number) {
    this.createSprite(x, y);
    this.sprite.setRotation(rotation);
    // Implementar outros ajustes de posicionamento se necessário
  }
}

class Team {
  name: string;
  players: Player[] = [];
  score: number = 0;

  constructor(name: string) {
    this.name = name;
  }
}

class Player {
  name: string;
  hand: Tile[] = [];
  team: Team;

  constructor(name: string, team: Team) {
    this.name = name;
    this.team = team;
  }

  getPlayableTiles(boardEnds: { left: number; right: number } | null): Tile[] {
    if (!boardEnds) return this.hand;
    return this.hand.filter(tile =>
      tile.left === boardEnds.left ||
      tile.right === boardEnds.left ||
      tile.left === boardEnds.right ||
      tile.right === boardEnds.right
    );
  }
}

class MainScene extends Phaser.Scene {
  players: Player[] = [];
  tiles: Tile[] = [];
  boardTiles: Tile[] = [];
  currentPlayerIndex: number = 0;
  teams: Team[] = [];

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.loadImages();
  }

  create() {
    this.initializeGame();
  }

  update() {
    // Atualizações do jogo, se necessário
  }

  loadImages() {
    this.load.image('table', 'assets/table.png');

    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const key = `tile_${i}_${j}`;
        this.load.image(key, `assets/tiles/${key}.png`);
      }
    }

    this.load.image('tile_back', 'assets/tiles/tile_back.png');
  }

  createTeams() {
    this.teams = [
      new Team('Equipe 1'),
      new Team('Equipe 2'),
    ];
  }

  createPlayers() {
    for (let i = 0; i < 4; i++) {
      const team = this.teams[i % 2];
      const player = new Player(`Jogador ${i + 1}`, team);
      team.players.push(player);
      this.players.push(player);
    }
  }

  createTiles() {
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const tile = new Tile(this, i, j);
        this.tiles.push(tile);
      }
    }
  }

  shuffleAndDealTiles() {
    Phaser.Utils.Array.Shuffle(this.tiles);

    for (let i = 0; i < 7; i++) {
      this.players.forEach((player, index) => {
        const tile = this.tiles.pop();
        if (tile) {
          player.hand.push(tile);
          // Exibir as pedras na mão do jogador 1 (humano)
          if (index === 0) {
            tile.createSprite(100 + i * 50, 500);
          }
        }
      });
    }
  }

  initializeGame() {
    this.createTeams();
    this.createPlayers();
    this.createTiles();
    this.shuffleAndDealTiles();
    this.startGame();
  }

  startGame() {
    this.currentPlayerIndex = this.findStartingPlayerIndex();
    this.nextTurn();
  }

  findStartingPlayerIndex(): number {
    const doubles = [6, 5, 4, 3, 2, 1, 0];
    for (const double of doubles) {
      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];
        if (player.hand.some(tile => tile.left === double && tile.right === double)) {
          console.log(`${player.name} começa o jogo com o duplo ${double}-${double}.`);
          return i;
        }
      }
    }
    console.log(`Nenhum jogador tem duplo. ${this.players[0].name} começa o jogo.`);
    return 0;
  }

  nextTurn() {
    const currentPlayer = this.players[this.currentPlayerIndex];

    this.playerTurn(currentPlayer);

    if (this.checkGameOver()) {
      this.endGame();
      return;
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    this.time.delayedCall(1000, () => this.nextTurn(), [], this);
  }

  playerTurn(player: Player) {
    const playableTiles = player.getPlayableTiles(this.getBoardEnds());

    if (playableTiles.length > 0) {
      const tile = playableTiles[0]; // Simplesmente joga a primeira pedra disponível
      this.playTile(player, tile);
    } else {
      console.log(`${player.name} não tem jogadas válidas e passa a vez.`);
    }
  }

  playTile(player: Player, tile: Tile) {
    Phaser.Utils.Array.Remove(player.hand, tile);

    // Remover a pedra da mão do jogador 1 (humano)
    if (player === this.players[0]) {
      tile.sprite.destroy();
    }

    if (this.boardTiles.length === 0) {
      this.boardTiles.push(tile);
      tile.placeAtPosition(this.cameras.main.centerX, this.cameras.main.centerY, 0);
    } else {
      const ends = this.getBoardEnds();
      let side: 'left' | 'right' | null = null;
      let rotation = 0;

      if (tile.left === ends.left) {
        [tile.left, tile.right] = [tile.right, tile.left];
        side = 'left';
      } else if (tile.right === ends.left) {
        side = 'left';
      } else if (tile.left === ends.right) {
        side = 'right';
      } else if (tile.right === ends.right) {
        [tile.left, tile.right] = [tile.right, tile.left];
        side = 'right';
      } else {
        console.log(`${player.name} não pode jogar a pedra [${tile.left}|${tile.right}] e passa a vez.`);
        return;
      }

      if (side === 'left') {
        const firstTile = this.boardTiles[0];
        const position = this.getNextPosition(firstTile.sprite.x, firstTile.sprite.y, 'left');
        this.boardTiles.unshift(tile);
        tile.placeAtPosition(position.x, position.y, rotation);
      } else if (side === 'right') {
        const lastTile = this.boardTiles[this.boardTiles.length - 1];
        const position = this.getNextPosition(lastTile.sprite.x, lastTile.sprite.y, 'right');
        this.boardTiles.push(tile);
        tile.placeAtPosition(position.x, position.y, rotation);
      }

      this.calculateScore();
    }

    console.log(`${player.name} jogou a pedra [${tile.left}|${tile.right}]`);
  }

  getNextPosition(x: number, y: number, side: 'left' | 'right'): { x: number; y: number } {
    const offsetX = 50;
    if (side === 'left') {
      return { x: x - offsetX, y: y };
    } else {
      return { x: x + offsetX, y: y };
    }
  }

  calculateScore() {
    const ends = this.getBoardEnds();
    if (!ends) return;

    const sum = ends.left + ends.right;

    if (sum % 5 === 0 && sum !== 0) {
      const currentTeam = this.players[this.currentPlayerIndex].team;
      currentTeam.score += sum;
      console.log(`Pontuação! ${currentTeam.name} ganha ${sum} pontos. Total: ${currentTeam.score}`);
    }
  }

  getBoardEnds(): { left: number; right: number } | null {
    if (this.boardTiles.length === 0) return null;
    const leftEnd = this.boardTiles[0].left;
    const rightEnd = this.boardTiles[this.boardTiles.length - 1].right;
    return { left: leftEnd, right: rightEnd };
  }

  checkGameOver(): boolean {
    return this.players.some(player => player.hand.length === 0);
  }

  endGame() {
    const winningTeam = this.teams.reduce((prev, current) => (prev.score > current.score ? prev : current));
    console.log(`Fim de jogo! ${winningTeam.name} vence com ${winningTeam.score} pontos.`);
  }
}

@Component({
  selector: 'app-domino-game',
  templateUrl: './domino-game.component.html',
  styleUrls: ['./domino-game.component.scss']
})
export class DominoGameComponent implements OnInit {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  game!: Phaser.Game;

  ngOnInit(): void {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: this.gameContainer.nativeElement,
      scene: [MainScene],
    };

    this.game = new Phaser.Game(config);
  }
}


